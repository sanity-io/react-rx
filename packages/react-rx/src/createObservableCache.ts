import {
  concat,
  defer,
  finalize,
  first,
  from,
  NEVER,
  type Observable,
  type ObservableInput,
  merge,
  ReplaySubject,
  share,
  tap,
  timer,
} from 'rxjs'

/** @public */
export interface ObservableCache<T> {
  /** The shared observable for `key`, the same instance for as long as the key is cached. */
  (key: string): Observable<T>
  /**
   * Forget every cached result, so the next caller refetches. Live subscribers keep theirs;
   * everything else is torn down now, pending timers included, rather than waiting out its `ttl`.
   */
  clear(): void
}

interface Entry<T> {
  observable: Observable<T>
  /** Releases the key now, cancelling its idle timer and ending any grace it is waiting out. */
  dispose(): void
}

/** @public */
export interface CreateObservableCacheOptions {
  /**
   * Retention (ms) of a key once nothing subscribes to it: how long its observable stays cached —
   * replaying its result to new subscribers — after the last one leaves.
   *
   * Pass the same value as the `ttl` of the {@link useObservablePromise} reading it, so a remount
   * within that window reuses the promise react-rx settled and renders no fallback. The two windows
   * nest rather than coincide: the hook holds this observable for its own `ttl` after the last
   * consumer unmounts, and this `ttl` only starts once it lets go. A remount in between renders a
   * fallback but makes no request, and a key is refetched only after both have elapsed.
   *
   * Make it environment-dependent wherever the cache is reachable outside a browser: a release is a
   * pending timer, and a pending timer keeps a Node process alive for the whole `ttl` — long enough
   * to hang a test runner or trip a leak detector. `0` in those environments still shares a request
   * between concurrent subscribers, but it gives up every window that outlives them, so a test that
   * asserts on reuse across a remount or on rejoining an abandoned request needs a real `ttl` (or
   * fake timers); `clear()` in a teardown drops the pending ones without changing `ttl` at all.
   */
  ttl: number
}

/**
 * Creates a keyed cache of shared observables for request-like sources (ones that complete). Every
 * caller of a key gets the same observable, which is what lets them share one request — and, with
 * {@link useObservablePromise}, one settled promise.
 *
 * The hook caches its promise per observable identity, so sharing the identity is what makes a
 * sibling or a remount render the loaded value instead of suspending again. An observable built per
 * component (`useMemo(() => fetchUser(id), [id])`) is a new identity for every consumer, and every
 * one of them fetches and suspends on its own.
 *
 * `share` dedupes the rest: concurrent subscribers join the same request, and its result replays to
 * later ones. A key is released `ttl` after its last subscriber leaves, and the next caller gets a
 * fresh observable that refetches. The same `ttl` is the grace an abandoned request gets: one that
 * loses every subscriber keeps running for `ttl`, long enough for a remount to rejoin it, and is
 * torn down with its key after that rather than left connected for nobody. Teardown unsubscribes
 * the source; whether that aborts the work in flight is the input's business — `fromFetch` aborts,
 * a plain promise keeps going and has its result dropped. `clear()` forgets every key at once, for
 * invalidating after a mutation.
 *
 * Failures are never cached — an error releases the key before it reaches subscribers, so the next
 * caller, an error handler reading the cache included, retries on a fresh entry. A request that
 * completes without emitting counts as a failure: it errors with RxJS's `EmptyError`, the same way
 * `firstValueFrom` and {@link useObservablePromise} treat an empty source. Since nothing holds the
 * failure, a key that keeps failing is fetched again by every render that reads it; bound that with
 * RxJS `retry` inside `fetch` when an endpoint can stay down.
 *
 * The cached observable ends at the first value the request produces and then stays open, since
 * subscribers are what keep the key and a completing source would release it the moment the result
 * arrived. So take the result with `first()` or `firstValueFrom` rather than an operator that waits
 * for completion — and expect one value per key: a source that goes on emitting, or that fails
 * after its result, is truncated there rather than forwarded to subscribers who already settled.
 *
 * Keys are plain strings, built by the caller from whatever identifies the request. Client-only,
 * like the rest of react-rx: the cache is module state, and react-rx never subscribes an observable
 * on the server, so an entry a server render created is released `ttl` later having fetched nothing.
 *
 * @public
 */
export function createObservableCache<T>(
  fetch: (key: string) => ObservableInput<T>,
  {ttl}: CreateObservableCacheOptions,
): ObservableCache<T> {
  const entries = new Map<string, Entry<T>>()

  function get(key: string): Observable<T> {
    const cached = entries.get(key)
    if (cached) {
      return cached.observable
    }
    // Replays, because `share` only subscribes this once nothing subscribes to the key: a key
    // released while it still had subscribers has to end their grace when the last one leaves.
    const disposed = new ReplaySubject<void>(1)
    // Comparing the entry keeps a late release from dropping a newer one for the same key. A
    // released key can no longer be rejoined, so any grace it is waiting out ends with it.
    const release = () => {
      if (entries.get(key)?.observable === shared) {
        entries.delete(key)
      }
      disposed.next()
    }
    // Callers can get an entry during a render that never commits, so nothing may ever subscribe.
    const idleRelease = setTimeout(release, ttl)
    const shared: Observable<T> = defer(() => {
      clearTimeout(idleRelease)
      // `first()` ends the request at its result, so only one that never produced a result can
      // terminate this entry: a later error would otherwise release the key while subscribers
      // still hold the result, and each of them would refetch on re-render. `NEVER` then keeps
      // the entry open, since completing would run `finalize` the moment the result arrived, and
      // `first()` still errors with `EmptyError` when the request produced nothing at all.
      return concat(from(fetch(key)).pipe(first()), NEVER)
    }).pipe(
      // Released before the error reaches subscribers, so an error handler that reads the cache
      // again gets a fresh entry rather than this one, which is about to be released anyway.
      tap({error: release}),
      finalize(release),
      share({
        connector: () => new ReplaySubject<T>(1),
        resetOnRefCountZero: () => merge(timer(ttl), disposed),
      }),
    )
    // `clear()` bypasses the idle timer, so it cancels it rather than letting it fire later.
    const dispose = () => {
      clearTimeout(idleRelease)
      release()
    }
    entries.set(key, {observable: shared, dispose})
    return shared
  }

  return Object.assign(get, {
    clear: () => {
      // Emptied first, so each entry's own release sees that it is no longer the cached one.
      const disposals = [...entries.values()]
      entries.clear()
      for (const entry of disposals) {
        entry.dispose()
      }
    },
  })
}

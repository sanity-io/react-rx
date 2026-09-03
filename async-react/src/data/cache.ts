import {
  defer,
  of,
  ReplaySubject,
  share,
  tap,
  timer,
  type Observable,
  type ObservableInput,
} from 'rxjs'

export interface ObservableCache<A extends unknown[], T> {
  /** The shared observable for these arguments; the same instance for the same arguments. */
  (...args: A): Observable<T>
  /** Forget every cached result. Live subscribers keep theirs; new ones refetch. */
  clear(): void
}

/**
 * A keyed, ref-counted observable cache for request-like sources (ones that
 * complete) — the observable-native counterpart of memoize-with-ttl and
 * request-dedupe libraries.
 *
 * Each argument tuple maps to one shared observable. `share` dedupes: every
 * concurrent subscriber joins the same in-flight request, a request that loses
 * all its subscribers still runs to completion and populates the cache, and
 * the result replays to late subscribers for `ttl` after it arrives. Then the
 * key is released and the next subscriber refetches. An error releases the
 * key immediately, so failures are never cached and never retained.
 */
export function createObservableCache<A extends unknown[], T>(
  fetch: (...args: A) => ObservableInput<T>,
  {ttl}: {ttl: number},
): ObservableCache<A, T> {
  const entries = new Map<string, Observable<T>>()

  function get(...args: A): Observable<T> {
    const key = JSON.stringify(args)
    const cached = entries.get(key)
    if (cached) {
      return cached
    }
    const release = () => {
      if (entries.get(key) === shared) {
        entries.delete(key)
      }
    }
    const shared: Observable<T> = defer(() => fetch(...args)).pipe(
      share({
        connector: () => new ReplaySubject<T>(1),
        resetOnRefCountZero: false,
        resetOnError: () => of(null).pipe(tap(release)),
        resetOnComplete: () => timer(ttl).pipe(tap(release)),
      }),
    )
    entries.set(key, shared)
    return shared
  }

  return Object.assign(get, {clear: () => entries.clear()})
}

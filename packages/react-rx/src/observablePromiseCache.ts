import {
  catchError,
  EmptyError,
  finalize,
  map,
  type Observable,
  type Subscription,
  of,
  share,
  tap,
  timer,
} from 'rxjs'

import {
  asObservablePromise,
  ObservablePromiseImpl,
  type ObservablePromise,
} from './observablePromise'

/**
 * Default retention (ms) when the hook does not pass `ttl`.
 * Long enough to bridge commit-time subscribe/unsubscribe gaps — StrictMode
 * double effects, suspend → Suspense retry → commit, quick unmount/remount —
 * so they collapse into a single source subscription instead of refetching.
 */
export const DEFAULT_HOOK_TTL = 500

/**
 * Default retention (ms) for `preloadObservablePromise` when `ttl` is omitted.
 * Longer than the hook default so a hover-warmed value survives until click/navigation.
 */
export const DEFAULT_PRELOAD_TTL = 5000

/**
 * Reject with the real RxJS `EmptyError` when a source completes without
 * emitting, matching `firstValueFrom` so `instanceof EmptyError` holds for
 * consumers. RxJS marks the constructor `@deprecated` ("internal implementation
 * detail"), but `firstValueFrom`/`first`/`single` throw this exact type, so
 * mirroring it is intentional here.
 */
function createEmptyError(): EmptyError {
  // oxlint-disable-next-line typescript/no-deprecated -- mirror firstValueFrom's thrown EmptyError so instanceof works
  return new EmptyError()
}

type Outcome<T> = {ok: true; value: T} | {ok: false; error: unknown}

/**
 * Stable accessor for one cache entry. `useObservablePromise` pins one of these
 * per observable identity (via `useMemo`) so a component that is mounted but has
 * no live store subscription — hidden `<Activity>` trees, `disabled` consumers —
 * keeps reading its settled promise even after the shared entry is evicted from
 * the cache by the ttl policy. Mirrors `useObservable`'s local-reference pattern.
 *
 * @internal
 */
export interface ObservablePromiseEntry<T> {
  /**
   * Adopt `ttl` into the retention policy (entries keep the max across
   * consumers). Pure metadata — never starts the source and never re-arms the
   * eviction/share grace window, so idle renders from mounted but
   * non-subscribed consumers (`disabled`, hidden `<Activity>`) cannot keep the
   * entry alive forever. Idempotent — safe on every render, including hidden
   * `<Activity>` pre-renders and renders that end up suspending.
   */
  adoptTtl(ttl: number): void
  /**
   * Intentional warm-up (`preloadObservablePromise`): adopt `ttl`, re-arm the
   * eviction/share grace window from now, and start the source subscription if
   * the entry has not settled yet. One of the two render-independent ways to
   * start a fetch, next to the commit-time store subscription; `ensureStarted`
   * is the render-time third trigger for live-consumer swaps.
   */
  warm(ttl: number): void
  /**
   * Start the source subscription if the entry is pending and idle — no live
   * subscribers, no resolver in flight, source not terminated — without
   * touching retention. Backs the hook's live-swap eager start: a consumer
   * that is already committed and subscribed re-rendering to a new observable
   * (`startTransition` / `useDeferredValue` swaps) starts the new source
   * during that render, so the suspended transition can settle and commit.
   * Idempotent; a no-op for settled, running, or already-subscribed entries.
   */
  ensureStarted(): void
  getPromise(): ObservablePromise<T>
  subscribe(onStoreChange: () => void): () => void
}

interface CacheEntry<T> {
  /** Unique per entry; used to guard stale finalize/eviction against successors. */
  readonly token: object
  source: Observable<T>
  current: ObservablePromiseImpl<T>
  settled: boolean
  retentionMs: number
  liveCount: number
  /** True once the shared source connection has completed or errored. */
  sourceTerminated: boolean
  shared$: Observable<void>
  resolverSub: Subscription | null
  evictionTimer: ReturnType<typeof setTimeout> | null
  handle: ObservablePromiseEntry<T>
}

const cache = new WeakMap<Observable<unknown>, CacheEntry<unknown>>()

function clearEvictionTimer(entry: CacheEntry<unknown>): void {
  if (entry.evictionTimer !== null) {
    clearTimeout(entry.evictionTimer)
    entry.evictionTimer = null
  }
}

function scheduleEviction(entry: CacheEntry<unknown>): void {
  clearEvictionTimer(entry)
  entry.evictionTimer = setTimeout(() => {
    entry.evictionTimer = null
    if (entry.liveCount > 0) {
      return
    }
    // Pending entries are never timed out — a suspended consumer may still be
    // waiting on this promise with no live uSES subscriber yet.
    if (!entry.settled) {
      return
    }
    if (cache.get(entry.source) === entry) {
      cache.delete(entry.source)
    }
    if (entry.resolverSub) {
      entry.resolverSub.unsubscribe()
      entry.resolverSub = null
    }
  }, entry.retentionMs)
}

function settle<T>(entry: CacheEntry<T>, outcome: Outcome<T>): void {
  if (!entry.settled) {
    entry.settled = true
    if (outcome.ok) {
      entry.current.fulfill(outcome.value)
    } else {
      entry.current.rejectWith(outcome.error)
    }
    // Resolver's job is done after first settle. Live subscribers (or share's
    // resetOnRefCountZero retention) keep the connection alive afterwards.
    if (entry.resolverSub) {
      entry.resolverSub.unsubscribe()
      entry.resolverSub = null
    }
    if (entry.liveCount === 0) {
      scheduleEviction(entry as CacheEntry<unknown>)
    }
    return
  }

  // Subsequent emissions: swap to a new pre-settled promise (unless Object.is).
  if (outcome.ok) {
    if (entry.current.status === 'fulfilled' && Object.is(entry.current.value, outcome.value)) {
      return
    }
    entry.current = ObservablePromiseImpl.fulfilled(outcome.value)
  } else {
    entry.current = ObservablePromiseImpl.rejected(outcome.error)
  }
}

function createEntry<T>(source: Observable<T>): CacheEntry<T> {
  const token = {}
  const entry: CacheEntry<T> = {
    token,
    source,
    current: new ObservablePromiseImpl<T>(),
    settled: false,
    // Every consumer adopts its ttl right after get-or-create (`adoptTtl` from
    // the hook, `warm` from preload), which sets the real retention. No
    // subscription can start before that.
    retentionMs: 0,
    liveCount: 0,
    sourceTerminated: false,
    shared$: undefined as unknown as Observable<void>,
    resolverSub: null,
    evictionTimer: null,
    handle: undefined as unknown as ObservablePromiseEntry<T>,
  }

  entry.shared$ = source.pipe(
    map((value): Outcome<T> => ({ok: true, value})),
    catchError((error: unknown) => of({ok: false, error} satisfies Outcome<T>)),
    tap({
      next: (outcome) => {
        settle(entry, outcome)
      },
      complete: () => {
        if (!entry.settled) {
          settle(entry, {ok: false, error: createEmptyError()})
        }
        entry.sourceTerminated = true
      },
    }),
    // After settling, the pipe is only a notifier for useSyncExternalStore.
    map(() => undefined as void),
    finalize(() => {
      // Do NOT set `sourceTerminated` here: finalize also runs when share resets
      // after refcount zero, which is not source completion. Remount must still
      // be able to reconnect to long-lived sources (e.g. Subject / SSE).
      // Comparing `token` prevents teardown of a stale, already replaced entry
      // from deleting its successor.
      //
      // Do NOT restart an already-pending eviction timer: unsubscribe/settle
      // schedule eviction for `retentionMs` at the same moment share starts its
      // disconnect grace. When that grace ends, finalize runs — restarting
      // eviction here would double the documented ttl.
      if (
        cache.get(source)?.token === token &&
        entry.liveCount === 0 &&
        entry.settled &&
        entry.evictionTimer === null
      ) {
        scheduleEviction(entry as CacheEntry<unknown>)
      }
    }),
    share({
      resetOnRefCountZero: () => timer(entry.retentionMs),
    }),
  )

  entry.handle = {
    adoptTtl: (ttl) => {
      // The hook calls this on every render — including disabled consumers and
      // hidden <Activity> trees that have no live store subscription — so it
      // must not reset the ttl clock or bounce share, or the entry/connection
      // could live forever. Pinning already keeps the mounted value after
      // eviction.
      entry.retentionMs = Math.max(entry.retentionMs, ttl)
    },
    warm: (ttl) => {
      entry.retentionMs = Math.max(entry.retentionMs, ttl)
      // Re-arm the grace window from now: reschedule a pending eviction and
      // bounce share's disconnect timer so the renewed retention also covers
      // the shared connection (emissions during the window keep updating the
      // cached promise).
      if (entry.evictionTimer !== null) {
        scheduleEviction(entry as CacheEntry<unknown>)
        if (!entry.sourceTerminated) {
          entry.shared$.subscribe().unsubscribe()
        }
      }
      ensureResolver(entry)
    },
    ensureStarted: () => {
      // Running or terminated entries must not gain a resolver: on a
      // never-settling source it would outlive the last real subscriber and
      // hold the shared connection open forever.
      if (entry.liveCount > 0 || entry.sourceTerminated) {
        return
      }
      ensureResolver(entry)
    },
    getPromise: () => asObservablePromise(entry.current),
    subscribe: (onStoreChange: () => void) => {
      // A pinned entry may have been evicted while its component was mounted
      // without a live subscription (hidden <Activity> beyond ttl). Re-register
      // it so new consumers share it again while it has live subscribers.
      if (!cache.has(source)) {
        cache.set(source, entry as CacheEntry<unknown>)
      }
      entry.liveCount++
      clearEvictionTimer(entry as CacheEntry<unknown>)

      if (entry.sourceTerminated) {
        // No further emissions possible — retain the settled promise without
        // re-subscribing (avoids refetching completed cold sources within TTL).
        return () => {
          entry.liveCount--
          if (entry.liveCount === 0 && entry.settled) {
            scheduleEviction(entry as CacheEntry<unknown>)
          }
        }
      }

      const subscription = entry.shared$.subscribe(onStoreChange)
      return () => {
        subscription.unsubscribe()
        entry.liveCount--
        if (entry.liveCount === 0 && entry.settled) {
          scheduleEviction(entry as CacheEntry<unknown>)
        }
      }
    },
  }

  return entry
}

function ensureResolver<T>(entry: CacheEntry<T>): void {
  if (entry.settled || entry.resolverSub) {
    return
  }
  // Keep the shared connection alive until first settle. Settle happens in tap;
  // this subscription exists purely for refcount / side-effect of starting the source.
  //
  // Sync emissions settle before `subscribe()` returns, so `entry.resolverSub` is
  // still null inside `settle` — unsubscribe the local subscription in that case.
  const subscription = entry.shared$.subscribe()
  if (entry.settled) {
    subscription.unsubscribe()
  } else {
    entry.resolverSub = subscription
  }
}

/**
 * Get or create the cache entry for `source` and return its stable handle.
 * Consumers apply their retention policy immediately after (`adoptTtl` from
 * the hook, `warm` from preload).
 *
 * @internal
 */
export function getObservablePromiseEntry<T>(source: Observable<T>): ObservablePromiseEntry<T> {
  let entry = cache.get(source) as CacheEntry<T> | undefined
  if (!entry) {
    entry = createEntry(source)
    // Insert before any subscription can start (via `ensure`): sync-terminating
    // sources trigger finalize immediately and must find the entry in the cache
    // to schedule eviction.
    cache.set(source, entry as CacheEntry<unknown>)
  }
  return entry.handle
}

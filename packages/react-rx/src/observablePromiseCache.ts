import {
  catchError,
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
 * Long enough to bridge suspend → Suspense retry → commit and StrictMode
 * double effects, so the single-component `use(useObservablePromise(...))`
 * pattern performs exactly one source subscription.
 */
export const DEFAULT_HOOK_TTL = 500

/**
 * Default retention (ms) for `preloadObservablePromise` when `ttl` is omitted.
 * Longer than the hook default so a hover-warmed value survives until click/navigation.
 */
export const DEFAULT_PRELOAD_TTL = 5000

/**
 * Mirrors RxJS `EmptyError` / `firstValueFrom` when a source completes without
 * emitting. We avoid constructing RxJS's deprecated `EmptyError` class.
 */
export class ObservableEmptyError extends Error {
  override name = 'EmptyError'
  constructor() {
    super('no elements in sequence')
  }
}

type Outcome<T> = {ok: true; value: T} | {ok: false; error: unknown}

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

function createEntry<T>(source: Observable<T>, retentionMs: number): CacheEntry<T> {
  const token = {}
  const entry: CacheEntry<T> = {
    token,
    source,
    current: new ObservablePromiseImpl<T>(),
    settled: false,
    retentionMs,
    liveCount: 0,
    sourceTerminated: false,
    shared$: undefined as unknown as Observable<void>,
    resolverSub: null,
    evictionTimer: null,
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
          settle(entry, {ok: false, error: new ObservableEmptyError()})
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
      if (cache.get(source)?.token === token && entry.liveCount === 0 && entry.settled) {
        scheduleEviction(entry as CacheEntry<unknown>)
      }
    }),
    share({
      resetOnRefCountZero: () => timer(entry.retentionMs),
    }),
  )

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
 * Get or create the cache entry for `source`. Optionally start the eager
 * resolver subscription (render-phase / preload fetching).
 *
 * @internal
 */
export function getObservablePromiseEntry<T>(
  source: Observable<T>,
  options: {ttl: number; startResolver: boolean},
): {
  getPromise: () => ObservablePromise<T>
  subscribe: (onStoreChange: () => void) => () => void
} {
  const {ttl, startResolver} = options
  let entry = cache.get(source) as CacheEntry<T> | undefined

  if (!entry) {
    entry = createEntry(source, ttl)
    // Insert before starting the resolver: sync-terminating sources trigger
    // finalize immediately and must find the entry to schedule eviction.
    cache.set(source, entry as CacheEntry<unknown>)
    if (startResolver) {
      ensureResolver(entry)
    }
  } else {
    entry.retentionMs = Math.max(entry.retentionMs, ttl)
    if (startResolver) {
      ensureResolver(entry)
    }
  }

  // For sync sources the entry may already be settled (and possibly scheduled
  // for eviction). Return the local reference regardless.
  const resolved = entry

  return {
    getPromise: () => asObservablePromise(resolved.current),
    subscribe: (onStoreChange: () => void) => {
      resolved.liveCount++
      clearEvictionTimer(resolved as CacheEntry<unknown>)

      if (resolved.sourceTerminated) {
        // No further emissions possible — retain the settled promise without
        // re-subscribing (avoids refetching completed cold sources within TTL).
        return () => {
          resolved.liveCount--
          if (resolved.liveCount === 0 && resolved.settled) {
            scheduleEviction(resolved as CacheEntry<unknown>)
          }
        }
      }

      const subscription = resolved.shared$.subscribe(onStoreChange)
      return () => {
        subscription.unsubscribe()
        resolved.liveCount--
        if (resolved.liveCount === 0 && resolved.settled) {
          scheduleEviction(resolved as CacheEntry<unknown>)
        }
      }
    },
  }
}

/** @internal — test helper */
export function __resetObservablePromiseCacheForTests(): void {
  // WeakMap has no clear; entries are keyed by caller-owned observables.
  // Tests rely on fresh observable identities instead.
}

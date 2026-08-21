import {useCallback, useMemo, useSyncExternalStore} from 'react'
import {type Observable} from 'rxjs'

import {type ObservablePromise} from './observablePromise'
import {
  DEFAULT_HOOK_TTL,
  DEFAULT_PRELOAD_TTL,
  getObservablePromiseEntry,
  type ObservablePromiseEntry,
} from './observablePromiseCache'

const EMPTY_OPTIONS = {}

/** @public */
export interface UseObservablePromiseOptions {
  /**
   * When `true`, this component starts neither the eager render-phase source
   * subscription nor the live store subscription — i.e. no data fetching on
   * behalf of this component.
   *
   * Like {@link useObservable}'s `disabled`, this fully prevents fetching. The
   * returned promise is the shared cache entry's current promise: it stays
   * pending until another consumer or {@link preloadObservablePromise} starts
   * the source, or this component re-renders with `disabled: false` — at which
   * point the same pending promise resolves.
   */
  disabled?: boolean
  /**
   * Retention (ms) of the cache entry once it is settled and has no live
   * subscribers: how long a settled value stays reusable by a later mount
   * without refetching, and how long the shared connection lingers before
   * teardown/eviction. The entry adopts the max `ttl` across all of its
   * consumers.
   *
   * Eviction only affects future consumers: components that are still mounted
   * keep their entry pinned, so hiding a `<Activity>` tree longer than `ttl`
   * does not drop the value it rendered.
   *
   * @defaultValue 500
   */
  ttl?: number
}

/** @public */
export interface PreloadObservablePromiseOptions {
  /**
   * Retention (ms) for the preloaded cache entry when nothing consumes it.
   *
   * @defaultValue 5000
   */
  ttl?: number
}

/**
 * Subscribe to an observable and return a `use()`-compatible promise that
 * activates Suspense until the first emission, then updates synchronously for
 * later emissions without re-suspending.
 *
 * @public
 */
export function useObservablePromise<T>(
  observable: Observable<T>,
  options: UseObservablePromiseOptions = EMPTY_OPTIONS,
): ObservablePromise<T> {
  const {disabled = false, ttl = DEFAULT_HOOK_TTL} = options

  // Pin the cache entry for as long as this component renders this observable
  // identity. A mounted component without a live store subscription (hidden
  // <Activity> tree, disabled consumer) must keep reading its settled promise
  // even if the shared entry is evicted after `ttl` — the same local-reference
  // pattern as `useObservable`.
  const entry: ObservablePromiseEntry<T> = useMemo(
    () => getObservablePromiseEntry(observable),
    [observable],
  )

  // Per-render policy on the pinned entry: adopt the max ttl and eagerly start
  // fetching unless disabled (required for Activity pre-rendering, where
  // effects never run). Idempotent.
  entry.ensure(ttl, !disabled)

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (disabled) {
        return () => {}
      }
      return entry.subscribe(onStoreChange)
    },
    [entry, disabled],
  )

  const getSnapshot = useCallback(() => entry.getPromise(), [entry])

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

/**
 * Warm the promise cache outside of rendering (e.g. `onMouseEnter`, route
 * loaders). Creates or reuses the cache entry, starts the source subscription
 * immediately, and returns the same {@link ObservablePromise} the hook would
 * return for that observable. Not a hook — callable anywhere.
 *
 * Pending entries are never timed out: a never-emitting source keeps the
 * promise pending and the subscription alive until it settles. Bound hang
 * risk with RxJS `timeout` (or cancel the source) when a preload can stall.
 *
 * @public
 */
export function preloadObservablePromise<T>(
  observable: Observable<T>,
  options: PreloadObservablePromiseOptions = EMPTY_OPTIONS,
): ObservablePromise<T> {
  const {ttl = DEFAULT_PRELOAD_TTL} = options
  const entry = getObservablePromiseEntry(observable)
  entry.ensure(ttl, true, true)
  return entry.getPromise()
}

export type {ObservablePromise} from './observablePromise'
export {DEFAULT_HOOK_TTL, DEFAULT_PRELOAD_TTL} from './observablePromiseCache'

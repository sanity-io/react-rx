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
   * When `true`, this component does not start the live store subscription at
   * commit — no data fetching on behalf of this component, and no re-render
   * notifications for later emissions (the returned promise only advances when
   * this component re-renders for other reasons).
   *
   * Unlike {@link useObservable}'s `disabled` (which still runs a warm-up probe
   * when no `initialValue` is given), this fully prevents fetching. The
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
 * The returned promise is meant to be passed as a prop to a child component
 * that reads it with React's `use()`, with a `<Suspense>` boundary **between**
 * this component and that child. The boundary placement is load-bearing:
 * rendering never subscribes the source — the fetch starts when the component
 * calling this hook commits (or via {@link preloadObservablePromise}) — and a
 * suspended component never commits. Without a boundary in between, the
 * child's suspension propagates to the hook caller itself and the fetch can
 * never start.
 *
 * For the same reason, never call `use()` on the promise in the same
 * component that called this hook: the component suspends on its own pending
 * promise before the commit that would start the fetch — wrong usage in the
 * same way as `use()`-ing a promise created during your own render, and
 * intentionally not guarded against.
 *
 * A hidden `<Activity>` tree pre-rendering this hook is fully paused: no
 * fetching happens until it is revealed (effects mount) or something else
 * warms the entry. To pre-render hidden content *with* data, call the hook in
 * a visible parent and pass the promise into the hidden tree, where
 * `use(promise)` lets React suspend/resume the pre-render on its own terms.
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

  // Per-render policy on the pinned entry is metadata only: adopt the max ttl
  // across consumers. Fetching is commit-driven (the store subscription below)
  // or explicit (preloadObservablePromise) — starting it here would make every
  // render a side effect and would fetch on behalf of hidden <Activity>
  // pre-renders, which must stay paused. Idempotent.
  entry.adoptTtl(ttl)

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
 * loaders). Creates or reuses the cache entry, re-arms its retention window,
 * starts the source subscription immediately, and returns the same
 * {@link ObservablePromise} the hook would return for that observable. Not a
 * hook — callable anywhere.
 *
 * This is the mechanism for starting a fetch before any consumer commits:
 * hover/route preloads, SSR request handlers, data for `<Activity>`
 * pre-renders, or warming the next observable before swapping to it inside a
 * transition. Rendering never subscribes the source — only this function and
 * committed consumers do.
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
  entry.warm(ttl)
  return entry.getPromise()
}

export type {ObservablePromise} from './observablePromise'
export {DEFAULT_HOOK_TTL, DEFAULT_PRELOAD_TTL} from './observablePromiseCache'

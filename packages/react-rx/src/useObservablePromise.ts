import {useCallback, useSyncExternalStore} from 'react'
import {type Observable} from 'rxjs'

import {type ObservablePromise} from './observablePromise'
import {
  DEFAULT_HOOK_TTL,
  DEFAULT_PRELOAD_TTL,
  getObservablePromiseEntry,
} from './observablePromiseCache'

const EMPTY_OPTIONS = {}

/** @public */
export interface UseObservablePromiseOptions {
  /**
   * When `true`, this component starts neither the eager render-phase source
   * subscription nor the live store subscription — i.e. no data fetching on
   * behalf of this component.
   *
   * Unlike {@link useObservable}'s `disabled` (which still runs a warm-up probe),
   * this fully prevents fetching. The returned promise is the shared cache
   * entry's current promise: it stays pending until another consumer or
   * {@link preloadObservablePromise} starts the source, or this component
   * re-renders with `disabled: false` — at which point the same pending
   * promise resolves.
   */
  disabled?: boolean
  /**
   * Retention (ms) of the cache entry once it is settled and has no live
   * subscribers: how long a settled value stays reusable by a later mount
   * without refetching, and how long the shared connection lingers before
   * teardown/eviction. The entry adopts the max `ttl` across all of its
   * consumers.
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

  // Render-phase: ensure the cache entry exists, adopt max ttl, and eagerly
  // start fetching unless disabled (required for Activity pre-rendering).
  getObservablePromiseEntry(observable, {ttl, startResolver: !disabled})

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (disabled) {
        return () => {}
      }
      return getObservablePromiseEntry(observable, {ttl, startResolver: false}).subscribe(
        onStoreChange,
      )
    },
    [observable, disabled, ttl],
  )

  const getSnapshot = useCallback(
    () => getObservablePromiseEntry(observable, {ttl, startResolver: false}).getPromise(),
    [observable, ttl],
  )

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

/**
 * Warm the promise cache outside of rendering (e.g. `onMouseEnter`, route
 * loaders). Creates or reuses the cache entry, starts the source subscription,
 * and returns the same {@link ObservablePromise} the hook would return for
 * that observable. Not a hook — callable anywhere.
 *
 * @public
 */
export function preloadObservablePromise<T>(
  observable: Observable<T>,
  options: PreloadObservablePromiseOptions = EMPTY_OPTIONS,
): ObservablePromise<T> {
  const {ttl = DEFAULT_PRELOAD_TTL} = options
  return getObservablePromiseEntry(observable, {ttl, startResolver: true}).getPromise()
}

export type {ObservablePromise} from './observablePromise'
export {DEFAULT_HOOK_TTL, DEFAULT_PRELOAD_TTL} from './observablePromiseCache'

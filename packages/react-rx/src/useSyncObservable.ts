import {useCallback, useMemo, useState, useSyncExternalStore} from 'react'
import type {Observable, ObservedValueOf} from 'rxjs'

import {getOrCreateStore} from './cache'
import type {UseObservableOptions} from './types'
import {EMPTY_OBJECT, getValue} from './utils'

/**
 * Subscribe to an observable and return its latest value synchronously via
 * [`useSyncExternalStore`](https://react.dev/reference/react/useSyncExternalStore).
 *
 * This is the v4 `useObservable` behavior. Prefer the deferred {@link useObservable} for most
 * reads. Reach for `useSyncObservable` when the value feeds a controlled input (or must stay
 * consistent within the same event), or when you need strict control over server markup: the
 * server renders the resolved `initialValue` and throws without one.
 *
 * Like {@link useObservable}, the hook's initial observable is only subscribed during render (to
 * pick up synchronous emissions for the first render) when no `initialValue` is given; with an
 * `initialValue` the subscription starts on commit. Replacement observables on later renders are
 * warmed up during render either way, so consumers that rebuild the observable on every render
 * settle instead of re-rendering forever.
 *
 * **Caveat:** store mutations cannot be marked as Transitions. Suspending on a value returned by
 * this hook replaces already-visible content with the nearest Suspense fallback — see the
 * [useSyncExternalStore caveats](https://react.dev/reference/react/useSyncExternalStore#caveats).
 *
 * @public
 */
export function useSyncObservable<ObservableType extends Observable<any>>(
  observable: ObservableType,
  initialValue: ObservedValueOf<ObservableType> | (() => ObservedValueOf<ObservableType>),
  options?: UseObservableOptions,
): ObservedValueOf<ObservableType>
/** @public */
export function useSyncObservable<ObservableType extends Observable<any>>(
  observable: ObservableType,
): undefined | ObservedValueOf<ObservableType>
/** @public */
export function useSyncObservable<ObservableType extends Observable<any>, InitialValue>(
  observable: ObservableType,
  initialValue: InitialValue | (() => InitialValue),
  options?: UseObservableOptions,
): InitialValue | ObservedValueOf<ObservableType>
/** @public */
export function useSyncObservable<ObservableType extends Observable<any>, InitialValue>(
  observable: ObservableType,
  initialValue?: InitialValue | (() => InitialValue),
  options: UseObservableOptions = EMPTY_OBJECT,
): InitialValue | ObservedValueOf<ObservableType> {
  const {disabled = false} = options

  const hasInitialValue = typeof initialValue !== 'undefined'
  // The render-phase warm-up is only skipped for the hook's initial observable (and only when an
  // `initialValue` provides something to render instead). Replacement observables are warmed even
  // with an `initialValue`: their rendered snapshot must match what the commit-time store
  // subscription delivers, or consumers that rebuild the observable on every render would loop
  // (render `initialValue` → subscribe on commit → sync emission forces a re-render → a new
  // identity renders `initialValue` again → …).
  const [initialObservable] = useState(observable)
  const shouldWarmUp = !hasInitialValue || observable !== initialObservable
  const instance = useMemo(
    () => getOrCreateStore(observable, shouldWarmUp),
    [observable, shouldWarmUp],
  )

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (disabled) {
        return () => {}
      }

      const subscription = instance.observable.subscribe(onStoreChange)
      return () => {
        subscription.unsubscribe()
      }
    },
    [instance.observable, disabled],
  )

  return useSyncExternalStore<ObservedValueOf<ObservableType>>(
    subscribe,
    () => {
      return instance.getSnapshot(initialValue)
    },
    // Strict v4 server contract: the server renders the resolved `initialValue`, and throws
    // (missing getServerSnapshot) without one — even when the observable emits synchronously.
    hasInitialValue ? () => getValue(initialValue) as ObservedValueOf<ObservableType> : undefined,
  )
}

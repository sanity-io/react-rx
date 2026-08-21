import {useCallback, useMemo, useState, useSyncExternalStore} from 'react'
import type {Observable, ObservedValueOf} from 'rxjs'

import {getOrCreateStore, needsWarmUp, trackSubscribed, type WarmUpTracker} from './cache'
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
 * Like {@link useObservable}, the observable is only subscribed during render (to pick up
 * synchronous emissions for the first render) when no `initialValue` is given; with an
 * `initialValue` the subscription starts on commit. Once the hook has received an emission,
 * replacement observables on later renders are warmed up during render either way, so consumers
 * that rebuild the observable on every render settle instead of re-rendering forever.
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
  // With an `initialValue` the warm-up is skipped until this hook has received an emission; after
  // that, replacement observables are warmed during render again so that consumers that rebuild
  // the observable on every render converge instead of looping — see `needsWarmUp`. The tracker is
  // only ever written on commit (in `subscribe` below), never during render.
  const [tracker] = useState((): WarmUpTracker => ({last: null}))
  const shouldWarmUp = needsWarmUp(tracker, observable, hasInitialValue, disabled)
  const instance = useMemo(
    () => getOrCreateStore(observable, shouldWarmUp),
    [observable, shouldWarmUp],
  )

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (disabled) {
        return () => {}
      }
      trackSubscribed(tracker, observable, instance)

      const subscription = instance.observable.subscribe(onStoreChange)
      return () => {
        subscription.unsubscribe()
      }
    },
    [tracker, observable, instance, disabled],
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

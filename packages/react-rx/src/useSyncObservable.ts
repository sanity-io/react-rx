import {useCallback, useMemo, useState, useSyncExternalStore} from 'react'
import type {Observable, ObservedValueOf} from 'rxjs'

import {getOrCreateStore, needsWarmUp, trackSubscribed, type WarmUpTracker} from './cache'
import type {UseObservableOptions} from './types'
import {EMPTY_OBJECT, getValue, missingInitialValueError, UNSET_INITIAL_VALUE} from './utils'

/**
 * Subscribe to an observable and return its latest value synchronously via
 * [`useSyncExternalStore`](https://react.dev/reference/react/useSyncExternalStore).
 *
 * This is the v4 `useObservable` behavior. Prefer the deferred {@link useObservable} for most
 * reads. Reach for `useSyncObservable` when the value feeds a controlled input, or must stay
 * consistent within the same event.
 *
 * `initialValue` is required: it is what renders until the observable emits, and what the server
 * renders. Every value is a valid initial value, `undefined` included — pass it explicitly;
 * omitting the argument throws during render. Functions act as initializers, exactly like
 * `useState`: pass `() => value` to compute the initial value lazily, and an initializer
 * returning the function when the initial value should be a function itself. When there is no
 * meaningful initial value, or you want to show fallback UI while the observable is "loading",
 * reach for {@link useObservablePromise} with `use()` and Suspense instead.
 *
 * Like {@link useObservable}, the observable is not subscribed during render: the `initialValue`
 * renders first and the live subscription starts on commit. Once the hook has received an
 * emission, replacement observables on later renders are warmed up during render, so consumers
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
export function useSyncObservable<ObservableType extends Observable<any>, InitialValue>(
  observable: ObservableType,
  initialValue: InitialValue | (() => InitialValue),
  options?: UseObservableOptions,
): InitialValue | ObservedValueOf<ObservableType>
/** @public */
export function useSyncObservable<ObservableType extends Observable<any>, InitialValue>(
  observable: ObservableType,
  ...args: [initialValue?: InitialValue | (() => InitialValue), options?: UseObservableOptions]
): InitialValue | ObservedValueOf<ObservableType> {
  // `undefined` (like every other value) is a valid `initialValue`, so a missing argument is
  // detected by arity and modeled with a sentinel no caller can pass.
  const initialValue =
    args.length === 0 ? UNSET_INITIAL_VALUE : (args[0] as InitialValue | (() => InitialValue))
  if (initialValue === UNSET_INITIAL_VALUE) {
    throw missingInitialValueError('useSyncObservable')
  }
  const {disabled = false} = args[1] ?? EMPTY_OBJECT

  // The warm-up is skipped until this hook has received an emission; after that, replacement
  // observables are warmed during render so that consumers that rebuild the observable on every
  // render converge instead of looping — see `needsWarmUp`. The tracker is only ever written on
  // commit (in `subscribe` below), never during render.
  const [tracker] = useState((): WarmUpTracker => ({last: null}))
  const shouldWarmUp = needsWarmUp(tracker, observable, disabled)
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
    // Strict v4 server contract: the server always renders the resolved `initialValue` — even
    // when a shared cache entry has already emitted in the same runtime.
    () => getValue(initialValue) as ObservedValueOf<ObservableType>,
  )
}

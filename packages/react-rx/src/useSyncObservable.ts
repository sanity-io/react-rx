import {useCallback, useMemo, useSyncExternalStore} from 'react'
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

  const instance = useMemo(() => getOrCreateStore(observable), [observable])

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
    typeof initialValue === 'undefined'
      ? undefined
      : () => getValue(initialValue) as ObservedValueOf<ObservableType>,
  )
}

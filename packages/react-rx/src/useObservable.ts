import {useCallback, useDeferredValue, useMemo, useSyncExternalStore} from 'react'
import {type Observable, type ObservedValueOf} from 'rxjs'

import {getOrCreateStore} from './cache'
import type {UseObservableOptions} from './types'
import {EMPTY_OBJECT} from './utils'

/**
 * Subscribe to an observable and return its latest value, with store updates deferred via
 * [`useDeferredValue`](https://react.dev/reference/react/useDeferredValue).
 *
 * Urgent renders keep the previous value while a background render catches up — so children that
 * suspend on the returned value keep showing already-revealed content instead of the nearest
 * Suspense fallback. Mounts, remounts, and `<Activity>` reveals still render the current snapshot
 * synchronously (no initial-value flash).
 *
 * On the server this hook renders exactly what the client's first paint will show (a synchronous
 * emission when there is one, else the resolved `initialValue`, else nothing) and never throws
 * for a missing `initialValue`. Prefer {@link useSyncObservable} for controlled inputs or when you
 * need the strict v4 server-snapshot contract.
 *
 * @public
 */
export function useObservable<ObservableType extends Observable<any>>(
  observable: ObservableType,
  initialValue: ObservedValueOf<ObservableType> | (() => ObservedValueOf<ObservableType>),
  options?: UseObservableOptions,
): ObservedValueOf<ObservableType>
/** @public */
export function useObservable<ObservableType extends Observable<any>>(
  observable: ObservableType,
): undefined | ObservedValueOf<ObservableType>
/** @public */
export function useObservable<ObservableType extends Observable<any>, InitialValue>(
  observable: ObservableType,
  initialValue: InitialValue | (() => InitialValue),
  options?: UseObservableOptions,
): InitialValue | ObservedValueOf<ObservableType>
/** @public */
export function useObservable<ObservableType extends Observable<any>, InitialValue>(
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

  const value = useSyncExternalStore<ObservedValueOf<ObservableType>>(
    subscribe,
    () => {
      return instance.getSnapshot(initialValue)
    },
    // Always provide getServerSnapshot so SSR never throws. The server renders
    // exactly what the client's first render will show (sync emission, else
    // initialValue, else undefined).
    () => instance.getSnapshot(initialValue),
  )

  // Second arg is only read on mount / Activity reveal (mount path). Passing the
  // live snapshot means those renders show the current value with no flash;
  // later store updates are deferred. On the server, Fizz returns this arg and
  // getServerSnapshot returns the same snapshot, so SSR matches the first client paint.
  // Safe if getSnapshot throws: the useSyncExternalStore call above throws first.
  // React Compiler may memoize this getSnapshot call — harmless, React only reads it on mount/reveal.
  return useDeferredValue(value, instance.getSnapshot(initialValue))
}

import {useMemo, useSyncExternalStore} from 'react'
import {type Observable, type ObservedValueOf} from 'rxjs'

import {getOrCreateObservable, getSnapshot, getValue} from './utils'

/** @public */
export function useObservable<ObservableType extends Observable<any>>(
  observable: ObservableType,
  initialValue: ObservedValueOf<ObservableType> | (() => ObservedValueOf<ObservableType>),
  debug?: boolean,
): ObservedValueOf<ObservableType>
/** @public */
export function useObservable<ObservableType extends Observable<any>>(
  observable: ObservableType,
): undefined | ObservedValueOf<ObservableType>
/** @public */
export function useObservable<ObservableType extends Observable<any>, InitialValue>(
  observable: ObservableType,
  initialValue: InitialValue | (() => InitialValue),
  debug?: boolean,
): InitialValue | ObservedValueOf<ObservableType>
/** @public */
export function useObservable<ObservableType extends Observable<any>, InitialValue>(
  observable: ObservableType,
  initialValue?: InitialValue | (() => InitialValue),
  debug?: boolean,
): InitialValue | ObservedValueOf<ObservableType> {
  const store = useMemo(() => {
    const instance = getOrCreateObservable(
      observable,
      // initialValue as ObservedValueOf<ObservableType> | (() => ObservedValueOf<ObservableType>),
      debug,
    )

    return {
      subscribe: (onStoreChange: () => void) => {
        if (debug) {
          console.log('subscribe', observable)
        }
        const subscription = instance.observable.subscribe(() => {
          if (debug) {
            console.log('onStoreChange', observable)
          }
          onStoreChange()
        })
        return () => {
          if (debug) {
            console.log('unsubscribe', observable)
          }
          subscription.unsubscribe()
        }
      },
      // getSnapshot: () => {
      //   if (debug) {
      //     console.log('getSnapshot', instance.snapshot, instance.error)
      //   }
      //   if (instance.error) {
      //     throw instance.error
      //   }
      //   return instance.snapshot
      // },
    }
  }, [debug, observable])

  return useSyncExternalStore<ObservedValueOf<ObservableType>>(
    store.subscribe,
    () =>
      getSnapshot(
        observable,
        initialValue as ObservedValueOf<ObservableType> | (() => ObservedValueOf<ObservableType>),
      ),
    typeof initialValue === 'undefined'
      ? undefined
      : () => getValue(initialValue) as ObservedValueOf<ObservableType>,
  )
}

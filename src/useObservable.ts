import {useEffect, useMemo, useRef, useSyncExternalStore} from 'react'
import {catchError, EMPTY, type Observable, type ObservedValueOf, type Subscription} from 'rxjs'
import {shareReplay, tap} from 'rxjs/operators'

function getValue<T>(value: T): T extends () => infer U ? U : T {
  return typeof value === 'function' ? value() : value
}
interface CacheRecord<T> {
  subscription: Subscription
  observable: Observable<T>
  snapshot: T
  error?: unknown
}

const cache = new WeakMap<Observable<any>, CacheRecord<any>>()

/** @public */
export function useObservable<ObservableType extends Observable<any>>(
  observable: ObservableType,
  initialValue: ObservedValueOf<ObservableType> | (() => ObservedValueOf<ObservableType>),
): ObservedValueOf<ObservableType>
/** @public */
export function useObservable<ObservableType extends Observable<any>>(
  observable: ObservableType,
): undefined | ObservedValueOf<ObservableType>
/** @public */
export function useObservable<ObservableType extends Observable<any>, InitialValue>(
  observable: ObservableType,
  initialValue: InitialValue,
): InitialValue | ObservedValueOf<ObservableType>
/** @public */
export function useObservable<ObservableType extends Observable<any>, InitialValue>(
  observable: ObservableType,
  initialValue?: InitialValue | (() => InitialValue),
): InitialValue | ObservedValueOf<ObservableType> {
  /**
   * Store the initialValue in a ref, as we don't want a changed `initialValue` to trigger a re-subscription.
   * But we also don't want the initialValue to be stale if the observable changes.
   */
  const initialValueRef = useRef(getValue(initialValue) as ObservedValueOf<ObservableType>)

  /**
   * Ensures that the initialValue is always up-to-date in case the observable changes.
   */
  useEffect(() => {
    initialValueRef.current = getValue(initialValue) as ObservedValueOf<ObservableType>
  }, [initialValue])

  const store = useMemo(() => {
    if (!cache.has(observable)) {
      const entry: Partial<CacheRecord<ObservedValueOf<ObservableType>>> = {
        snapshot: initialValueRef.current,
      }
      entry.observable = observable.pipe(
        shareReplay({refCount: true, bufferSize: 1}),
        tap({
          next: (value) => {
            entry.snapshot = value
            entry.error = undefined
          },
          error: (error: unknown) => (entry.error = error),
        }),
        // ignore errors in the observable, as they get thrown during the getSnapshot phase later
        catchError(() => EMPTY),
      )

      // Eagerly subscribe to sync set `entry.currentValue` to what the observable returns, and keep the observable alive until the component unmounts.
      entry.subscription = entry.observable.subscribe()

      cache.set(observable, entry as CacheRecord<ObservedValueOf<ObservableType>>)
    }
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const instance = cache.get(observable)!
    if (instance.subscription.closed) {
      instance.subscription = instance.observable.subscribe()
    }

    return {
      subscribe: (onStoreChange: () => void) => {
        const subscription = instance.observable.subscribe(onStoreChange)
        instance.subscription.unsubscribe()
        return () => {
          subscription.unsubscribe()
        }
      },
      getSnapshot: () => {
        if (instance.error) {
          throw instance.error
        }
        return instance.snapshot
      },
    }
  }, [observable])

  return useSyncExternalStore<ObservedValueOf<ObservableType>>(store.subscribe, store.getSnapshot)
}

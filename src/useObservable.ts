import {useEffect, useMemo, useRef, useSyncExternalStore} from 'react'
import {
  asapScheduler,
  catchError,
  finalize,
  type Observable,
  type ObservedValueOf,
  of,
  share,
  timer,
} from 'rxjs'
import {map, tap} from 'rxjs/operators'

function getValue<T>(value: T): T extends () => infer U ? U : T {
  return typeof value === 'function' ? value() : value
}

interface CacheRecord<T> {
  observable: Observable<void>
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
  initialValue: InitialValue | (() => InitialValue),
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
        map((value) => ({snapshot: value, error: undefined})),
        catchError((error) => of({snapshot: undefined, error})),
        tap(({snapshot, error}) => {
          entry.snapshot = snapshot
          entry.error = error
        }),
        // Note: any value or error emitted by the provided observable will be mapped to the cache entry's mutable state
        // and the observable is thereafter only used as a notifier to call `onStoreChange`, hence the `void` return type.
        map((value) => void value),
        // Ensure that the cache entry is deleted when the observable completes or errors.
        finalize(() => cache.delete(observable)),
        share({resetOnRefCountZero: () => timer(0, asapScheduler)}),
      )

      // Eagerly subscribe to sync set `entry.currentValue` to what the observable returns, and keep the observable alive until the component unmounts.
      const subscription = entry.observable.subscribe()
      subscription.unsubscribe()

      cache.set(observable, entry as CacheRecord<ObservedValueOf<ObservableType>>)
    }
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const instance = cache.get(observable)!

    return {
      subscribe: (onStoreChange: () => void) => {
        const subscription = instance.observable.subscribe(onStoreChange)
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

  return useSyncExternalStore<ObservedValueOf<ObservableType>>(
    store.subscribe,
    store.getSnapshot,
    typeof initialValueRef.current === 'undefined' ? undefined : () => initialValueRef.current,
  )
}

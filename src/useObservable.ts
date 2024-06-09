import {useEffect, useMemo, useRef, useSyncExternalStore} from 'react'
import type {Observable, Subscription} from 'rxjs'
import {shareReplay, tap} from 'rxjs/operators'

function getValue<T>(value: T): T extends () => infer U ? U : T {
  return typeof value === 'function' ? value() : value
}
interface CacheRecord<T> {
  subscription: Subscription
  observable: Observable<T>
  snapshot: T
}

const cache = new WeakMap<Observable<any>, CacheRecord<any>>()

export function useObservable<ObservableType extends Observable<any>>(
  observable: ObservableType,
  initialValue?: UnboxObservable<ObservableType> | (() => UnboxObservable<ObservableType>),
): UnboxObservable<ObservableType> {
  /**
   * Store the initialValue in a ref, as we don't want a changed `initialValue` to trigger a re-subscription.
   * But we also don't want the initialValue to be stale if the observable changes.
   */
  const initialValueRef = useRef(getValue(initialValue) as UnboxObservable<ObservableType>)

  /**
   * Ensures that the initialValue is always up-to-date in case the observable changes.
   */
  useEffect(() => {
    initialValueRef.current = getValue(initialValue) as UnboxObservable<ObservableType>
  }, [initialValue])

  const store = useMemo(() => {
    if (!cache.has(observable)) {
      const entry: Partial<CacheRecord<UnboxObservable<ObservableType>>> = {
        snapshot: initialValueRef.current,
      }
      entry.observable = observable.pipe(
        shareReplay({refCount: true, bufferSize: 1}),
        tap((value) => (entry.snapshot = value)),
      )

      // Eagerly subscribe to sync set `entry.currentValue` to what the observable returns, and keep the observable alive until the component unmounts.
      entry.subscription = entry.observable.subscribe()

      cache.set(observable, entry as CacheRecord<UnboxObservable<ObservableType>>)
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
        return () => subscription.unsubscribe()
      },
      getSnapshot: () => instance.snapshot,
    }
  }, [observable])

  return useSyncExternalStore<UnboxObservable<ObservableType>>(store.subscribe, store.getSnapshot)
}

type UnboxObservable<T> = T extends Observable<infer U> ? U : never

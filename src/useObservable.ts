import {useEffect, useMemo, useRef, useSyncExternalStore} from 'react'
import {Observable, Subscription} from 'rxjs'
import {shareReplay, tap} from 'rxjs/operators'

function getValue<T>(value: T): T extends () => infer U ? U : T {
  return typeof value === 'function' ? value() : value
}

interface CacheRecord<T> {
  subscription: Subscription
  observable: Observable<T>
  currentValue: T
}

const cache = new WeakMap<Observable<any>, CacheRecord<any>>()
function getOrCreateStore<T>(inputObservable: Observable<T>, initialValue: T) {
  if (!cache.has(inputObservable)) {
    const entry: Partial<CacheRecord<T>> = {currentValue: initialValue}
    entry.observable = inputObservable.pipe(
      shareReplay({refCount: true, bufferSize: 1}),
      tap(value => (entry.currentValue = value)),
    )

    // Eagerly subscribe to sync set `entry.currentValue` to what the observable returns
    entry.subscription = entry.observable.subscribe()

    cache.set(inputObservable, entry as CacheRecord<T>)
  }
  return cache.get(inputObservable)!
}

export function useObservable<ObservableType extends Observable<any>>(
  observable: ObservableType,
  initialValue?: UnboxObservable<ObservableType> | (() => UnboxObservable<ObservableType>),
): UnboxObservable<ObservableType> {
  /**
   * Store the initialValue in a ref, as we don't want a changed `initialValue` to trigger a re-subscription.
   * But we also don't want the initialValue to be stale if the observable changes.
   */
  const initialValueRef = useRef(getValue(initialValue))

  /**
   * Ensures that the initialValue is always up-to-date in case the observable changes.
   */
  useEffect(() => {
    initialValueRef.current = getValue(initialValue)
  }, [initialValue])

  const [getSnapshot, subscribe] = useMemo<
    [() => UnboxObservable<ObservableType>, Parameters<typeof useSyncExternalStore>[0]]
  >(() => {
    const store = getOrCreateStore(observable, initialValueRef.current)
    if (store.subscription.closed) {
      store.subscription = store.observable.subscribe()
    }
    return [
      function getSnapshot() {
        // @TODO: perf opt opportunity: we could do `store.subscription.unsubscribe()` here to clear up some memory, as this subscription is only needed to provide a sync initialValue.
        return store.currentValue
      },
      function subscribe(callback: () => void) {
        // @TODO: perf opt opportunity: we could do `store.subscription.unsubscribe()` here as we only need 1 subscription active to keep the observer alive
        const sub = store.observable.subscribe(callback)
        return () => {
          sub.unsubscribe()
        }
      },
    ]
  }, [observable])

  const shouldRestoreSubscriptionRef = useRef(false)
  useEffect(() => {
    const store = getOrCreateStore(observable, initialValueRef.current)
    if (shouldRestoreSubscriptionRef.current) {
      if (store.subscription.closed) {
        store.subscription = store.observable.subscribe()
      }
      shouldRestoreSubscriptionRef.current = false
    }

    return () => {
      // React StrictMode will call effects as `setup + teardown + setup` thus we can't trust this callback as "react is about to unmount"
      // Tracking this ref lets us set the subscription back up on the next `setup` call if needed, and if it really did unmounted then all is well
      shouldRestoreSubscriptionRef.current = !store.subscription.closed
      store.subscription.unsubscribe()
    }
  }, [observable])

  return useSyncExternalStore<UnboxObservable<ObservableType>>(subscribe, getSnapshot)
}

type UnboxObservable<T> = T extends Observable<infer U> ? U : never

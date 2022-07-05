import {Observable, Subscription} from 'rxjs'
import {DependencyList, useMemo} from 'react'
import {useSyncExternalStore} from 'use-sync-external-store/shim'
import {shareReplay, tap} from 'rxjs/operators'
import {useIsomorphicEffect} from './useIsomorphicEffect'

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
    entry.subscription = entry.observable.subscribe()

    cache.set(inputObservable, entry as CacheRecord<T>)
  }
  return cache.get(inputObservable)
}

export function useObservable<T>(observable: Observable<T>): T | undefined
export function useObservable<T>(observable: Observable<T>, initialValue: T): T
export function useObservable<T>(observable: Observable<T>, initialValue: () => T): T
export function useObservable<T>(observable: Observable<T>, initialValue?: T | (() => T)) {
  const [getSnapshot, subscribe] = useMemo(() => {
    const record = getOrCreateStore(observable, getValue(initialValue))!
    return [
      function getSnapshot() {
        return record.currentValue
      },
      function subscribe(callback: (value: T) => void) {
        const sub = record.observable.subscribe(next => callback(next))
        return () => {
          sub.unsubscribe()
        }
      },
    ]
  }, [observable])

  useIsomorphicEffect(() => {
    return () => {
      getOrCreateStore(observable, getValue(initialValue))!.subscription.unsubscribe()
    }
  }, [observable])

  return useSyncExternalStore(subscribe, getSnapshot)
}

export function useMemoObservable<T>(
  observableOrFactory: Observable<T> | (() => Observable<T>),
  deps: DependencyList,
): T | undefined
export function useMemoObservable<T>(
  observableOrFactory: Observable<T> | (() => Observable<T>),
  deps: DependencyList,
  initialValue: T | (() => T),
): T
export function useMemoObservable<T>(
  observableOrFactory: Observable<T> | (() => Observable<T>),
  deps: DependencyList,
  initialValue?: T | (() => T),
) {
  return useObservable(
    useMemo(() => getValue(observableOrFactory), deps),
    initialValue,
  )
}

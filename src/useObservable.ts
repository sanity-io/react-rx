import {defer, merge, Observable, of, pipe} from 'rxjs'
import {DependencyList, useMemo} from 'react'
import {useAsObservable} from './useAsObservable'
import {distinctUntilChanged, switchMap} from 'rxjs/operators'
import {useSyncExternalStore} from 'use-sync-external-store/shim'

function getValue<T>(value: T): T extends () => infer U ? U : T {
  return typeof value === 'function' ? value() : value
}

function useObservableSubscription<T>(observable: Observable<T>): T {
  const store = useMemo(() => {
    let currentValue: T
    return {
      // Note: this works because the given observable always emits a value synchronously by concat-ing the given initialValue
      getCurrentValue: () => currentValue,
      subscribe: (callback: (value: T) => void) => {
        const subscription = observable.subscribe(value => {
          currentValue = value
          callback(value)
        })
        return () => {
          subscription.unsubscribe()
        }
      },
    }
  }, [observable])
  return useSyncExternalStore(store.subscribe, store.getCurrentValue)
}

export function useObservable<T>(observable: Observable<T>): T | undefined
export function useObservable<T>(observable: Observable<T>, initialValue: T): T
export function useObservable<T>(observable: Observable<T>, initialValue: () => T): T
export function useObservable<T>(observable: Observable<T>, initialValue?: T | (() => T)) {
  return useObservableSubscription(
    useAsObservable(
      observable,
      pipe(
        distinctUntilChanged(),
        switchMap(observable =>
          merge(
            defer(() => of(getValue(initialValue))),
            observable,
          ),
        ),
      ),
    ),
  )
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

import {Observable, Subject, Subscription} from 'rxjs'
import {DependencyList, useMemo, useRef} from 'react'
import {useSyncExternalStore} from 'use-sync-external-store/shim'

function getValue<T>(value: T): T extends () => infer U ? U : T {
  return typeof value === 'function' ? value() : value
}

export function useObservable<T>(observable: Observable<T>): T | undefined
export function useObservable<T>(observable: Observable<T>, initialValue: T): T
export function useObservable<T>(observable: Observable<T>, initialValue: () => T): T
export function useObservable<T>(observable: Observable<T>, initialValue?: T | (() => T)) {
  const [getSnapshot, subscribe] = useMemo(() => {
    let currentValue = getValue(initialValue)
    const subject = new Subject<T>()
    const subscription = observable.subscribe(value => {
      currentValue = value
      subject.next(value)
    })
    return [
      () => currentValue,
      (callback: (value: T) => void) => {
        const subjectSub = subject.subscribe(value => callback(value))
        return () => {
          subscription.unsubscribe()
          subjectSub.unsubscribe()
        }
      },
    ]
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

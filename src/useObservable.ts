import {concat, defer, Observable, of, pipe, Subscription} from 'rxjs'
import {DependencyList, useEffect, useMemo, useRef, useState} from 'react'
import {useAsObservable} from './useAsObservable'
import {distinctUntilChanged, switchMap} from 'rxjs/operators'

function getValue<T>(value: T): T extends () => infer U ? U : T {
  return typeof value === 'function' ? value() : value
}

function useSubscription<T>(observable: Observable<T>): T {
  const subscription = useRef<Subscription>()
  const [value, setState] = useState<T>(() => {
    let isSync = true
    let syncVal: T
    subscription.current = observable.subscribe(nextVal => {
      if (isSync) {
        syncVal = nextVal
      } else {
        setState(nextVal)
      }
    })
    isSync = false
    return syncVal!
  })

  useEffect(() => {
    return () => {
      subscription.current!.unsubscribe()
    }
  }, [])

  return value
}

export function useObservable<T>(observable: Observable<T>): T | undefined
export function useObservable<T>(observable: Observable<T>, initialValue: T): T
export function useObservable<T>(observable: Observable<T>, initialValue: () => T): T
export function useObservable<T>(observable: Observable<T>, initialValue?: T | (() => T)) {
  return useSubscription(
    useAsObservable(
      observable,
      pipe(
        distinctUntilChanged(),
        switchMap(observable =>
          concat(
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

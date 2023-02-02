import {Observable} from 'rxjs'
import {DependencyList, useEffect, useRef, useState} from 'react'
import {tap} from 'rxjs/operators'

function getValue<T>(value: T): T extends () => infer U ? U : T {
  return typeof value === 'function' ? value() : value
}

export function useObservable<T>(observable: Observable<T>): T | undefined
export function useObservable<T>(observable: Observable<T>, initialValue: T): T
export function useObservable<T>(observable: Observable<T>, initialValue: () => T): T
export function useObservable<T>(observable: Observable<T>, initialValue?: T | (() => T)) {
  const [value, setValue] = useState(() => getValue(initialValue))
  const initialValueRef = useRef(initialValue)
  initialValueRef.current = initialValue
  useEffect(() => {
    setValue(getValue(initialValueRef.current))
    const subscription = observable.pipe(tap(next => setValue(next))).subscribe()
    return () => subscription.unsubscribe()
  }, [initialValueRef, observable])

  return value
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
  const [value, setValue] = useState(() => getValue(initialValue))
  useEffect(() => {
    const subscription = getValue(observableOrFactory)
      .pipe(tap(next => setValue(next)))
      .subscribe()
    return () => subscription.unsubscribe()
  }, deps)

  return value
}

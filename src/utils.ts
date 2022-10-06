import {Observable, OperatorFunction} from 'rxjs'
import {useAsObservable} from './useAsObservable'
import {observableCallback} from 'observable-callback'
import {startWith} from 'rxjs/operators'
import {Dispatch, SetStateAction, useContext, useRef, useState, Context} from 'react'

const createState = <T>(initialState: T) => observableCallback(startWith<T, T>(initialState))

export function observeState<T>(
  initial: T | (() => T),
): [Observable<T>, Dispatch<SetStateAction<T>>]
export function observeState<T>(
  initial?: T | (() => T),
): [Observable<T | undefined>, Dispatch<SetStateAction<T | undefined>>] {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [value, update] = useState<T | undefined>(initial)
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return [useAsObservable(value), update]
}

export function observeCallback<T>(): [Observable<T>, (arg: T) => void]
export function observeCallback<T, K>(
  operator: OperatorFunction<T, K>,
): [Observable<K>, (arg: T) => void]
export function observeCallback<T, K>(
  operator?: OperatorFunction<T, K>,
): [Observable<T | K>, (arg: T) => void] {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const ref = useRef<[Observable<T | K>, (arg: T) => void]>()
  if (!ref.current) {
    ref.current = operator ? observableCallback<T, K>(operator) : observableCallback<T>()
  }
  return ref.current
}

export function observeContext<T>(context: Context<T>): Observable<T> {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return useAsObservable(useContext<T>(context))
}

export function observeElement<T>(): [Observable<T | null>, (el: T | null) => void] {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const ref = useRef<[Observable<T | null>, (value: T | null) => void]>()
  if (!ref.current) {
    ref.current = createState<T | null>(null)
  }
  return ref.current
}

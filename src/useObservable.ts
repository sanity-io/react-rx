import * as React from 'react'
import {BehaviorSubject, Observable, Subject, Subscription} from 'rxjs'
import {createEventHandler} from './utils'

export function toObservable<T>(value: T): Observable<T>
export function toObservable<T, K>(
  value: T,
  setup: (props$: Observable<T>) => Observable<K>,
): Observable<K>
export function toObservable<T, K>(
  value: T,
  setup?: (props$: Observable<T>) => Observable<K>,
): Observable<T | K> {
  const isInitial = React.useRef(true)
  const subjectRef = React.useRef<Subject<T>>(new BehaviorSubject(value))
  const observableRef = React.useRef<Observable<T> | Observable<K>>(
    setup ? setup(subjectRef.current.asObservable()) : subjectRef.current.asObservable(),
  )

  React.useEffect(() => {
    if (isInitial.current) {
      isInitial.current = false
    } else {
      // emit only on update
      subjectRef.current.next(value)
    }
  }, [value])
  React.useEffect(() => {
    return () => {
      return subjectRef.current.complete()
    }
  }, [])

  return observableRef.current
}

const isCallable = (val: unknown): val is (...args: unknown[]) => unknown =>
  typeof val === 'function'

function getValue<T>(value: T): T
function getValue<T>(value: T | (() => T)): T {
  return isCallable(value) ? value() : value
}

export function useObservable<T>(observable$: Observable<T>): T | undefined
export function useObservable<T>(observable$: Observable<T>, initialValue: T): T
export function useObservable<T>(observable$: Observable<T>, initialValue: () => T): T
export function useObservable<T>(observable$: Observable<T>, initialValue?: T): T | undefined {
  const subscription = React.useRef<Subscription>()
  const isInitial = React.useRef(true)
  const [value, setState] = React.useState<T | undefined>(() => {
    let isSync = true
    let syncVal = getValue(initialValue)
    subscription.current = observable$.subscribe(nextVal => {
      if (isSync) {
        syncVal = nextVal
      } else {
        setState(nextVal)
      }
    })
    isSync = false
    return syncVal
  })

  React.useEffect(() => {
    // when the observable$ changes after initial (possibly sync render)
    if (!isInitial.current) {
      subscription.current = observable$.subscribe(nextVal => setState(nextVal))
    }
    isInitial.current = false
    return () => {
      if (subscription.current) {
        subscription.current.unsubscribe()
      }
    }
  }, [observable$])

  return value
}

export function useObservableState<T>(
  initial: T | (() => T),
): [Observable<T>, React.Dispatch<React.SetStateAction<T>>]

export function useObservableState<T>(
  initial?: T | (() => T),
): [Observable<T | undefined>, React.Dispatch<React.SetStateAction<T | undefined>>] {
  const [value, update] = React.useState<T | undefined>(initial)
  return [toObservable(value), update]
}

export function useObservableContext<T>(context: React.Context<T>): Observable<T> {
  return toObservable(React.useContext<T>(context))
}

type ObservableEventTuple<Event> = [Observable<Event>, (event: Event) => void]

export function useObservableEvent<Event>(): ObservableEventTuple<Event> {
  return React.useMemo<ObservableEventTuple<Event>>(createEventHandler, [])
}

export function useObservableElement<Element extends HTMLElement>(): [
  Observable<Element | null>,
  (el: Element | null) => void,
] {
  return useObservableState<Element | null>(null)
}

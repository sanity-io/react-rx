import * as React from 'react'
import {BehaviorSubject, Observable, Subject, Subscription} from 'rxjs'
import {createEventHandler} from './common'

export {createState, createEventHandler} from './common'

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
  const subject = React.useRef<Subject<T>>(new BehaviorSubject(value))

  React.useEffect(() => {
    if (isInitial.current) {
      isInitial.current = false
    } else {
      // emit only on update
      subject.current.next(value)
    }
  }, [value])
  React.useEffect(() => {
    return () => {
      return subject.current.complete()
    }
  }, [])

  const observable = subject.current.asObservable()
  return setup ? setup(observable) : observable
}

export function useObservable<T>(observable$: Observable<T>): T | null
export function useObservable<T>(observable$: Observable<T>, initialValue: T): T
export function useObservable<T>(observable$: Observable<T>, initialValue?: T): T | null {
  const subscription = React.useRef<Subscription>()
  const [value, setState] = React.useState<T | null>(() => {
    let isSync = true
    let syncVal = typeof initialValue === 'undefined' ? null : initialValue
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

  React.useEffect(
    () => () => {
      if (subscription.current) {
        subscription.current.unsubscribe()
      }
    },
    [],
  )

  return value
}

export function useObservableState<T>(): [
  Observable<T | undefined>,
  React.Dispatch<React.SetStateAction<T | undefined>>,
]
export function useObservableState<T>(
  initial: T | (() => T),
): [Observable<T>, React.Dispatch<React.SetStateAction<T>>]

export function useObservableState<T>(initial?: T | (() => T)) {
  const [value, update] = React.useState<T | undefined>(initial)
  return [toObservable(value), update]
}

export function useObservableContext<T>(context: React.Context<T>): Observable<T> {
  const value = React.useContext<T>(context)
  return toObservable(value)
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

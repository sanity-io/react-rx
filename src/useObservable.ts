import * as React from 'react'
import {Observable, Subscription} from 'rxjs'

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
        subscription.current = undefined
      }
    }
  }, [observable$])

  return value
}

import {BehaviorSubject, Observable, Subject} from 'rxjs'
import * as React from 'react'

/**
 * React hook to convert any props or state value into an observable
 * Returns an observable representing updates to any React value (props, state or any other calculated value)
 * @param value
 */
export function useAsObservable<T>(value: T): Observable<T> {
  const isInitial = React.useRef(true)
  const subjectRef = React.useRef<Subject<T>>(new BehaviorSubject(value))
  const observableRef = React.useRef<Observable<T>>()
  if (!observableRef.current) {
    observableRef.current = subjectRef.current.asObservable()
  }

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

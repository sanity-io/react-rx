import {BehaviorSubject, Observable, Subject} from 'rxjs'
import {useEffect, useRef} from 'react'

/**
 * React hook to convert any props or state value into an observable
 * Returns an observable representing updates to any React value (props, state or any other calculated value)
 * Note: the returned observable is the same instance throughout the component lifecycle
 * @param value
 */
export function useAsObservable<T>(value: T): Observable<T> {
  const isInitial = useRef(true)
  const subjectRef = useRef<Subject<T>>(new BehaviorSubject(value))
  const observableRef = useRef<Observable<T>>()
  if (!observableRef.current) {
    observableRef.current = subjectRef.current.asObservable()
  }

  useEffect(() => {
    if (isInitial.current) {
      isInitial.current = false
    } else {
      // emit only on update
      subjectRef.current.next(value)
    }
  }, [value])
  useEffect(() => {
    return () => {
      return subjectRef.current.complete()
    }
  }, [])

  return observableRef.current
}

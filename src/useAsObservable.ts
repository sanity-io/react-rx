import {BehaviorSubject, Observable} from 'rxjs'
import {useEffect, useMemo} from 'react'
import {useIsomorphicEffect} from './useIsomorphicEffect'

/**
 * React hook to convert any props or state value into an observable
 * Returns an observable representing updates to any React value (props, state or any other calculated value)
 * Note: the returned observable is the same instance throughout the component lifecycle
 * @param value
 */
export function useAsObservable<T>(value: T): Observable<T>
export function useAsObservable<T, K>(
  value: T,
  operator: (input: Observable<T>) => Observable<K>,
): Observable<K>
export function useAsObservable<T, K = T>(
  value: T,
  operator?: (input: Observable<T>) => Observable<K>,
): Observable<T | K> {
  const [observable, subject] = useMemo(() => {
    const subject = new BehaviorSubject(value)

    const observable = subject.asObservable()
    return [operator ? observable.pipe(operator) : observable, subject]
  }, [])

  useIsomorphicEffect(() => {
    subject.next(value)
  }, [value])

  useEffect(() => {
    return () => {
      subject.complete()
    }
  }, [])

  return observable
}

import {BehaviorSubject, Observable} from 'rxjs'
import {useCallback, useRef} from 'react'
import {useIsomorphicEffect} from './useIsomorphicEffect'
import {distinctUntilChanged} from 'rxjs/operators'

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
  const setup = useCallback((): [Observable<T | K>, BehaviorSubject<T>] => {
    const subject = new BehaviorSubject(value)

    const observable = subject.asObservable().pipe(distinctUntilChanged())
    return [operator ? observable.pipe(operator) : observable, subject]
  }, [])

  const ref = useRef<[Observable<T | K>, BehaviorSubject<T>]>()

  if (!ref.current) {
    ref.current = setup()
  }

  const [observable] = ref.current

  useIsomorphicEffect(() => {
    if (!ref.current) {
      return
    }
    const [, subject] = ref.current
    subject.next(value)
  }, [value, ref])

  useIsomorphicEffect(() => {
    return () => {
      if (!ref.current) {
        return
      }
      const [, subject] = ref.current
      subject.complete()
      ref.current = undefined
    }
  }, [])
  return observable
}

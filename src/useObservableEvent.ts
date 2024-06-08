import {observableCallback} from 'observable-callback'
import {DependencyList, useCallback, useEffect, useRef} from 'react'
import {Observable} from 'rxjs'

const EMPTY_DEPS: DependencyList = []

export function useObservableCallback<T, U>(
  fn: (arg: Observable<T>) => Observable<U>,
  dependencies: DependencyList = EMPTY_DEPS,
): (arg: T) => void {
  const callbackRef = useRef<[Observable<T>, (val: T) => void]>()

  if (!callbackRef.current) {
    callbackRef.current = observableCallback<T>()
  }

  const [calls$, call] = callbackRef.current

  const callback = useCallback(fn, dependencies)

  useEffect(() => {
    const subscription = calls$.pipe(callback).subscribe()
    return () => {
      subscription.unsubscribe()
    }
  }, [calls$, call, callback])

  return call
}

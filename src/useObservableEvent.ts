import {observableCallback} from 'observable-callback'
import {useCallback, useEffect, useInsertionEffect, useRef, useState} from 'react'
import {Observable} from 'rxjs'

export function useObservableEvent<T, U>(
  fn: (arg: Observable<T>) => Observable<U>,
): (arg: T) => void {
  const [[calls$, call]] = useState(() => observableCallback<T>())

  const callback = useEffectEvent(fn)

  useEffect(() => {
    const subscription = calls$.pipe(callback).subscribe()
    return () => subscription.unsubscribe()
  }, [callback, calls$])

  return call
}

/**
 * This is a ponyfill of the upcoming `useEffectEvent` hook that'll arrive in React 19
 */
function useEffectEvent<
  const T extends (
    ...args: // eslint-disable-next-line @typescript-eslint/no-explicit-any
    any[]
  ) => void,
>(fn: T): T {
  const ref = useRef<T | null>(null)
  useInsertionEffect(() => {
    ref.current = fn
  }, [fn])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return useCallback((...args: any[]) => {
    const f = ref.current!
    return f(...args)
  }, []) as T
}

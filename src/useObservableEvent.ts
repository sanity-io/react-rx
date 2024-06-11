import {observableCallback} from 'observable-callback'
import {useCallback, useEffect, useInsertionEffect, useRef, useState} from 'react'
import {type Observable} from 'rxjs'

/** @public */
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
 * This is a ponyfill of the upcoming `useEffectEvent` hook that'll arrive in React 19.
 * https://19.react.dev/learn/separating-events-from-effects#declaring-an-effect-event
 * To learn more about the ponyfill itself, see: https://blog.bitsrc.io/a-look-inside-the-useevent-polyfill-from-the-new-react-docs-d1c4739e8072
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

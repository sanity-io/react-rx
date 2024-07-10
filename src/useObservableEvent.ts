import {observableCallback} from 'observable-callback'
import {useEffect, useState} from 'react'
import {type Observable} from 'rxjs'
import {useEffectEvent} from 'use-effect-event'

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

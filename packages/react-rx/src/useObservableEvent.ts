import {useEffect, useState} from 'react'
import {type Observable} from 'rxjs'

import {observableCallback} from './observableCallback'
import {useEffectEvent} from './useEffectEvent'

/** @public */
export function useObservableEvent<T, U>(
  handleEvent: (arg: Observable<T>) => Observable<U>,
): (arg: T) => void {
  const [[calls$, call]] = useState(() => observableCallback<T>())

  const onEvent = useEffectEvent((observable: Observable<T>) => handleEvent(observable))

  useEffect(() => {
    const subscription = calls$.pipe((observable) => onEvent(observable)).subscribe()
    return () => subscription.unsubscribe()
  }, [calls$])

  return call
}

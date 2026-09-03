import {useEffect, useState} from 'react'
import {type Observable} from 'rxjs'

import {observableCallback} from './observableCallback'
import {useEffectEvent} from './useEffectEvent'

/**
 * @deprecated Removed in react-rx v7. Push events into a `Subject` you own and read the derived
 * stream with `useObservable` or `useSyncObservable`. Migration guide:
 * https://react-rx.dev/migrate/v6-to-v7#useobservableevent-is-removed
 *
 * @example
 * ```tsx
 * import {useMemo, useState} from 'react'
 * import {useObservable} from 'react-rx'
 * import {map, Subject} from 'rxjs'
 *
 * function ShowSliderValue() {
 *   const [input$] = useState(() => new Subject<string>())
 *   const value$ = useMemo(() => input$.pipe(map((value) => Number(value))), [input$])
 *   const value = useObservable(value$, 1)
 *   return (
 *     <input
 *       type="range"
 *       value={value}
 *       onChange={(event) => input$.next(event.currentTarget.value)}
 *     />
 *   )
 * }
 * ```
 * @public
 */
export function useObservableEvent<T, U>(
  handleEvent: (arg: Observable<T>) => Observable<U>,
): (arg: T) => void {
  const [[calls$, call]] = useState(() => observableCallback<T>())

  const onEvent = useEffectEvent((observable: Observable<T>) => handleEvent(observable))

  useEffect(() => {
    const subscription = calls$.pipe((observable) => onEvent(observable)).subscribe()
    return () => subscription.unsubscribe()
    // oxlint-disable-next-line react/exhaustive-effect-dependencies -- onEvent is a useEffectEvent callback
  }, [calls$])

  return call
}

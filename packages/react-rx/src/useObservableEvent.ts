import {useEffect} from 'react'
import {type Observable} from 'rxjs'

import {useEffectEvent} from './useEffectEvent'
import {useObservableSubject} from './useObservableSubject'

/**
 * @deprecated Removed in react-rx v7. Use `useObservableSubject` and read the derived stream with
 * `useObservable` or `useSyncObservable`. Migration guide:
 * https://react-rx.dev/migrate/v6-to-v7#useobservableevent-is-removed
 *
 * @example
 * ```tsx
 * import {useMemo} from 'react'
 * import {useObservable, useObservableSubject} from 'react-rx'
 * import {map} from 'rxjs'
 *
 * function ShowSliderValue() {
 *   const [input$, handleChange] = useObservableSubject<string>()
 *   const value$ = useMemo(() => input$.pipe(map((value) => Number(value))), [input$])
 *   const value = useObservable(value$, 1)
 *   return (
 *     <input
 *       type="range"
 *       value={value}
 *       onChange={(event) => handleChange(event.currentTarget.value)}
 *     />
 *   )
 * }
 * ```
 * @public
 */
export function useObservableEvent<T, U>(
  handleEvent: (arg: Observable<T>) => Observable<U>,
): (arg: T) => void {
  const [events$, emit] = useObservableSubject<T>()

  const onEvent = useEffectEvent((observable: Observable<T>) => handleEvent(observable))

  useEffect(() => {
    const subscription = events$.pipe(onEvent).subscribe()
    return () => subscription.unsubscribe()
    // oxlint-disable-next-line react/exhaustive-effect-dependencies -- onEvent is a useEffectEvent callback
  }, [events$])

  return emit
}

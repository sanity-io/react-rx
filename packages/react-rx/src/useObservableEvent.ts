import {useEffect, useState} from 'react'
import {type Observable} from 'rxjs'

import {observableCallback} from './observableCallback'
import {useEffectEvent} from './useEffectEvent'

/**
 * @deprecated Removed in react-rx v7. Push events into a `Subject` you own instead. Call
 * `subject.next(event)` from the handler and read the derived stream with `useObservable` or
 * `useSyncObservable`. Subscribe side-effect-only pipelines in an effect. Migration guide:
 * https://react-rx.dev/migrate/v6-to-v7#useobservableevent-is-removed
 *
 * @example
 * ```tsx
 * // Before
 * const [value, setValue] = useState(1)
 * const handleChange = useObservableEvent((value$) =>
 *   value$.pipe(map((value) => Number(value)), tap(setValue)),
 * )
 * // <input onChange={(event) => handleChange(event.currentTarget.value)} />
 *
 * // After
 * const [input$] = useState(() => new Subject<string>())
 * const value$ = useMemo(() => input$.pipe(map((value) => Number(value))), [input$])
 * const value = useObservable(value$, 1)
 * // <input onChange={(event) => input$.next(event.currentTarget.value)} />
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

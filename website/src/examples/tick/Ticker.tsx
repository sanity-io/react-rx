import {useMemo} from 'react'
import {useObservable} from 'react-rx'
import {
  distinctUntilChanged,
  map,
  type Observable,
  switchMap,
  timer,
} from 'rxjs'

export function Ticker(props: {
  observable: Observable<number>
}) {
  const observable = useMemo(
    () =>
      props.observable.pipe(
        distinctUntilChanged(),
        switchMap((tick) =>
          timer(300).pipe(map(() => tick)),
        ),
      ),
    [props.observable],
  )
  const tick = useObservable(observable, 0)

  return <p>Delayed tick: {tick}</p>
}

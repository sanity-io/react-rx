import {useMemo} from 'react'
import {useObservable} from 'react-rx'
import {type Observable, timer} from 'rxjs'
import {
  distinctUntilChanged,
  map,
  startWith,
  switchMap,
} from 'rxjs/operators'

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
        startWith(0),
      ),
    [props.observable],
  )
  const tick = useObservable(observable)

  return <p>Delayed tick: {tick}</p>
}

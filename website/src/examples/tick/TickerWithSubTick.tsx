import {useMemo} from 'react'
import {useObservable} from 'react-rx'
import {
  distinctUntilChanged,
  map,
  type Observable,
  sampleTime,
  switchMap,
  timer,
} from 'rxjs'

const initial = {tick: 0, subtick: 0} as const

export function TickerWithSubTick(props: {
  observable: Observable<number>
}) {
  const observable = useMemo(
    () =>
      props.observable.pipe(
        distinctUntilChanged(),
        switchMap((tick) =>
          timer(0, 10).pipe(
            map((subtick) => ({
              tick,
              subtick,
            })),
          ),
        ),
        sampleTime(20),
      ),
    [props.observable],
  )
  const {tick, subtick} = useObservable(
    observable,
    initial,
  )

  return (
    <div>
      {tick}:{subtick}
    </div>
  )
}

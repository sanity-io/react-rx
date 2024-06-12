import {useMemo} from 'react'
import {useObservable} from 'react-rx'
import {type Observable, timer} from 'rxjs'
import {
  distinctUntilChanged,
  map,
  sampleTime,
  switchMap,
} from 'rxjs/operators'

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

import * as React from 'react'
import {interval, Observable, timer} from 'rxjs'
import {distinctUntilChanged, map, switchMap} from 'rxjs/operators'
import {reactiveComponent} from '../../src/reactiveComponent'
import {useObservable} from '../../src/useObservable'

interface TickerProps {
  tick: number
}

const Ticker = reactiveComponent<TickerProps>(props$ =>
  props$.pipe(
    map((props: TickerProps) => props.tick),
    distinctUntilChanged(),
    switchMap(tick => interval(100).pipe(map(subtick => [tick, subtick]))),
    map(([tick, subtick]) => `Tick: ${tick}, subtick: ${subtick}`)
  )
)

interface TickerWithSubTickProps {
  tick: number
  subtick: number
}

const TickerWithSubTick = reactiveComponent<TickerProps>(props$ =>
  props$.pipe(
    map(props => props.tick),
    distinctUntilChanged(),
    switchMap(tick =>
      interval(100).pipe(map((subtick): TickerWithSubTickProps => ({tick, subtick})))
    ),
    map((props: TickerWithSubTickProps) => (
      <div>
        Tick: {props.tick}, subtick: {props.subtick}
      </div>
    ))
  )
)

export const TickExample = () => {
  const tick = useObservable(timer(0, 1000), 0)
  return (
    <>
      TICK: {tick}
      <Ticker tick={tick} />
      <TickerWithSubTick tick={tick} />
    </>
  )
}

import * as React from 'react'
import {interval, timer} from 'rxjs'
import {distinctUntilChanged, map, mapTo, sampleTime, startWith, switchMap} from 'rxjs/operators'
import {reactiveComponent} from '../../../src/reactiveComponent'

interface TickerProps {
  tick: number
}

const Ticker = reactiveComponent<TickerProps>(props$ =>
  props$.pipe(
    map((props: TickerProps) => props.tick),
    distinctUntilChanged(),
    switchMap(tick => timer(300).pipe(mapTo(tick))),
    startWith(0),
    map(tick => `Delayed tick: ${tick}`),
  ),
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
      timer(0, 10).pipe(map((subtick): TickerWithSubTickProps => ({tick, subtick}))),
    ),
    sampleTime(20),
    map((props: TickerWithSubTickProps) => (
      <div>
        {props.tick}:{props.subtick}
      </div>
    )),
  ),
)

export const TickExample = reactiveComponent(
  timer(0, 1000).pipe(
    map(tick => (
      <>
        <div>Tick: {tick}</div>
        <Ticker tick={tick} />
        <TickerWithSubTick tick={tick} />
      </>
    )),
  ),
)

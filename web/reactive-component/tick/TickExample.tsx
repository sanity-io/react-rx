import * as rxjs from 'rxjs'
import * as operators from 'rxjs/operators'
import * as React from 'react'
import {component} from '../../../src'
import {render} from '../../utils/eval-render-noop'

const {timer} = rxjs
const {distinctUntilChanged, map, mapTo, sampleTime, startWith, switchMap} = operators

interface TickerProps {
  tick: number
}

const Ticker = component<TickerProps>(props$ =>
  props$.pipe(
    map((props: TickerProps) => props.tick),
    distinctUntilChanged(),
    switchMap(tick => timer(300).pipe(mapTo(tick))),
    startWith(0),
    map(tick => `Delayed tick: ${tick}`)
  )
)

interface TickerWithSubTickProps {
  tick: number
  subtick: number
}

const TickerWithSubTick = component<TickerProps>(props$ =>
  props$.pipe(
    map(props => props.tick),
    distinctUntilChanged(),
    switchMap(tick =>
      timer(0, 10).pipe(map((subtick): TickerWithSubTickProps => ({tick, subtick})))
    ),
    sampleTime(20),
    map((props: TickerWithSubTickProps) => (
      <div>
        {props.tick}:{props.subtick}
      </div>
    ))
  )
)

const TickExample = component(
  timer(0, 1000).pipe(
    map(tick => (
      <>
        <div>Tick: {tick}</div>
        <Ticker tick={tick} />
        <TickerWithSubTick tick={tick} />
      </>
    ))
  )
)

render(<TickExample />)

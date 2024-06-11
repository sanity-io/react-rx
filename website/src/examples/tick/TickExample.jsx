import * as React from 'react'
import * as ReactDOM from 'react-dom'
import * as RxJS from 'rxjs'
import * as operators from 'rxjs/operators'

const {of, from, concat, merge} = RxJS
const {
  timer,
  interval,
  throwError,
  combineLatest,
  Observable,
} = RxJS

const {map, filter, reduce, scan, tap} =
  operators
const {
  concatMap,
  mergeMap,
  switchMap,
  mapTo,
} = operators
const {startWith, catchError, take} =
  operators
//@endimport

import {observableCallback} from 'observable-callback'
import {
  context,
  elementRef,
  forwardRef,
  handler,
  rxComponent,
  state,
  useAsObservable,
  useMemoObservable,
  useObservable,
} from 'react-rx-old'

const {
  distinctUntilChanged,
  sampleTime,
} = operators

const Ticker = rxComponent((props$) =>
  props$.pipe(
    map((props) => props.tick),
    distinctUntilChanged(),
    switchMap((tick) =>
      timer(300).pipe(mapTo(tick)),
    ),
    startWith(0),
    map(
      (tick) => `Delayed tick: ${tick}`,
    ),
  ),
)

const TickerWithSubTick = rxComponent(
  (props$) =>
    props$.pipe(
      map((props) => props.tick),
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
      map((props) => (
        <div>
          {props.tick}:{props.subtick}
        </div>
      )),
    ),
)

const TickExample = rxComponent(
  timer(0, 1000).pipe(
    map((tick) => (
      <>
        <div>Tick: {tick}</div>
        <Ticker tick={tick} />
        <TickerWithSubTick
          tick={tick}
        />
      </>
    )),
  ),
)

export default TickExample

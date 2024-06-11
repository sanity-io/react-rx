import {observableCallback} from 'observable-callback'
import {CSSProperties} from 'react'
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

const {map, filter, reduce, scan, tap} = operators
const {concatMap, mergeMap, switchMap, mapTo} =
  operators
const {startWith, catchError, take} = operators
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

const CONTAINER: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  position: 'relative',
  height: 200,
  width: 200,
  textAlign: 'center',
}

const BADGE: CSSProperties = {
  borderRadius: 26,
  backgroundColor: 'red',
  padding: 4,
  height: 26,
  width: 26,
}

const [clicks$, click] = observableCallback()
const clickCount$ = clicks$.pipe(
  scan((count) => count + 1, 0),
)

const ClickCountBadge = rxComponent(
  clickCount$.pipe(
    map((clicks) => (
      <span style={BADGE}>{clicks}</span>
    )),
  ),
)

const Clicker = rxComponent(
  of(<button onClick={click}>CLICK ME!</button>),
)

const Example = (
  <div style={CONTAINER}>
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
      }}
    >
      <ClickCountBadge />
    </div>
    <div
      style={{
        position: 'absolute',
        top: 0,
        right: 0,
      }}
    >
      <ClickCountBadge />
    </div>
    <div style={{width: '100%'}}>
      <Clicker />
    </div>
    <div
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
      }}
    >
      <ClickCountBadge />
    </div>
    <div
      style={{
        position: 'absolute',
        bottom: 0,
        right: 0,
      }}
    >
      <ClickCountBadge />
    </div>
  </div>
)
ReactDOM.render(
  Example,
  document.getElementById('shared-state-example'),
)

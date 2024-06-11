import {combineLatest, timer} from 'rxjs'

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

const ticks$ = timer(0, 1000)

function useClickCounter(): [number, () => void] {
  const [clickCount, setClickCount] =
    React.useState(0)
  const inc = React.useCallback(
    () => setClickCount((c) => c + 1),
    [],
  )

  return [clickCount, inc]
}

const HooksInteropExample = rxComponent(() => {
  const [clickCount, inc] = useClickCounter()

  // This is required in order to turn clickCount into an observable value
  const click$ = useAsObservable(clickCount)

  return combineLatest([click$, ticks$]).pipe(
    map(([clickCount, tickNumber]) => (
      <>
        Tick: {tickNumber}
        <button onClick={inc}>
          This button has been clicked{' '}
          {clickCount} times
        </button>
      </>
    )),
  )
})

ReactDOM.render(
  <HooksInteropExample />,
  document.getElementById('forward-ref-example'),
)

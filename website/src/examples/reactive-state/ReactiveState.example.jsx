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

const ReactiveStateExample = rxComponent(() => {
  const [delay$, setDelay] = state(100)

  return delay$.pipe(
    switchMap((delay) =>
      timer(500, delay).pipe(
        map((n) => `Count: ${n}`),
        startWith('Starting counter…'),
        map((label) => (
          <>
            Counter interval (ms):{' '}
            <input
              type="range"
              min={0}
              max={1000}
              step={100}
              onChange={(e) =>
                setDelay(
                  Number(e.currentTarget.value),
                )
              }
            />
            {delay}
            <div>{label}</div>
          </>
        )),
      ),
    ),
  )
})

ReactDOM.render(
  <ReactiveStateExample />,
  document.getElementById('use-state-example'),
)

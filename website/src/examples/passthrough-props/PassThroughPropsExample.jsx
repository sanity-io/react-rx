import {formatDistance} from 'date-fns'
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

const {share} = operators

const UPDATE_INTERVAL = 1000
const currentTime$ = timer(
  0,
  UPDATE_INTERVAL,
).pipe(
  take(10),
  map(() => new Date()),
  share(),
)

const TimeDistance = rxComponent((props$) =>
  combineLatest([currentTime$, props$]).pipe(
    map(([currentTime, ownerProps]) =>
      formatDistance(
        ownerProps.time,
        currentTime,
        {
          includeSeconds:
            ownerProps.includeSeconds,
        },
      ),
    ),
  ),
)

const NOW = new Date()
const PassThroughPropsExample = () => (
  <>
    <h2>
      With <code>includeSeconds</code> true
    </h2>
    With synchronized updates
    <p>
      Page loaded{' '}
      <TimeDistance time={NOW} includeSeconds />{' '}
      ago
    </p>
    <p>
      Page loaded{' '}
      <TimeDistance time={NOW} includeSeconds />{' '}
      ago
    </p>
    <h2>
      Without <code>includeSeconds</code>
    </h2>
    <p>
      Page loaded <TimeDistance time={NOW} /> ago
    </p>
  </>
)

ReactDOM.render(
  <PassThroughPropsExample />,
  document.getElementById(
    'pass-through-props-example',
  ),
)

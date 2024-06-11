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

const {mergeMapTo, switchMapTo} = operators

const timer$ = timer(0, 1000)

const ErrorsExample = rxComponent(() => {
  const [onRetry$, onRetry] = handler()
  const [onError$, onError] = handler()

  const errors$ = onError$.pipe(
    mergeMapTo(
      throwError(
        new Error(
          "You clicked the button, didn't you!?",
        ),
      ),
    ),
  )

  return merge(timer$, errors$).pipe(
    map((n) => ({
      number: n,
    })),
    catchError((error, caught$) => {
      return merge(
        of({error}),
        onRetry$.pipe(
          take(1),
          switchMapTo(
            concat(
              of({
                error,
                retrying: true,
              }),
              caught$,
            ),
          ),
        ),
      )
    }),
    map((props) => (
      <div>
        {props.error ? (
          props.retrying ? (
            <>Trying again…</>
          ) : (
            <>
              <div
                style={{
                  color: 'crimson',
                }}
              >
                Oh no! An error occurred:
                <br />
                {props.error.message}
              </div>
              <button onClick={onRetry}>
                Try again
              </button>
            </>
          )
        ) : (
          <>
            <div>
              You did not click the button for:{' '}
              {props.number}s
            </div>
            <button
              type="button"
              onClick={onError}
            >
              DO NOT CLICK THE BUTTON
            </button>
          </>
        )}
      </div>
    )),
  )
})

ReactDOM.render(
  <ErrorsExample />,
  document.getElementById('errors-example'),
)

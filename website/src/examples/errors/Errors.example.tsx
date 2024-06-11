import {handler, rxComponent} from 'react-rx-old'
import {
  concat,
  merge,
  of,
  throwError,
  timer,
} from 'rxjs'
import {
  catchError,
  map,
  mergeMapTo,
  switchMapTo,
  take,
} from 'rxjs/operators'

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
    map((props: any) => (
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

export default ErrorsExample

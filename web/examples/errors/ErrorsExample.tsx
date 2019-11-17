import {
  React,
  ReactDOM,
  catchError,
  concat,
  map,
  merge,
  mergeMapTo,
  of,
  switchMapTo,
  take,
  throwError,
  timer,
  component,
  useEvent
} from '../_utils/globalScope'
//@endimport

interface Props {
  number?: number
  error?: null | Error
  retrying?: boolean | Error
  onRetry?: (event: React.MouseEvent) => void
}

const numbers$ = timer(500, 500)

const ErrorsExample = component(() => {
  const [onRetry$, onRetry] = useEvent<React.MouseEvent>()
  const [onError$, onError] = useEvent<React.MouseEvent>()

  const errors$ = onError$.pipe(
    mergeMapTo(throwError(new Error('User triggered an error')))
  )

  return merge(numbers$, errors$).pipe(
    map(n => ({number: n})),
    catchError((error, caught$) => {
      return merge(
        of({error}),
        onRetry$.pipe(
          take(1),
          switchMapTo(concat(of({error, retrying: true}), caught$))
        )
      )
    }),
    map((props: Props) => (
      <>
        <p>This observable stream will fail when you click the button below</p>

        <p>
          <button type="button" onClick={onError}>
            Trigger error!
          </button>
        </p>
        {props.error ? (
          <>
            {props.retrying ? (
              <>Retrying…</>
            ) : (
              <>
                <p>Oh no: an error occurred: {props.error.message}</p>
                <p>
                  <button onClick={onRetry}>Retry</button>
                </p>
              </>
            )}
          </>
        ) : (
          <>Counter: {props.number}</>
        )}
      </>
    ))
  )
})

ReactDOM.render(<ErrorsExample />, document.getElementById('errors'))

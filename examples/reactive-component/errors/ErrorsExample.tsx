import * as React from 'react'
import {concat, merge, of, timer} from 'rxjs'
import {catchError, map, switchMapTo, take, tap} from 'rxjs/operators'
import {reactiveComponent, useEvent} from '../../../src/reactiveComponent'

const numbers$ = timer(500, 500).pipe(
  tap(() => {
    if (Math.random() > 0.9) {
      throw new Error('A random error occurred')
    }
  }),
)

interface Props {
  number?: number
  error?: null | Error
  retrying?: boolean | Error
  onRetry?: (event: any) => void
}

export const ErrorsExample = reactiveComponent(() => {
  const [onRetry$, onRetry] = useEvent<React.MouseEvent>()

  return numbers$.pipe(
    map(n => ({number: n})),
    catchError<any, any>((error, caught$) => {
      return merge(
        of({error}),
        onRetry$.pipe(
          take(1),
          switchMapTo(concat(of({error, retrying: true}), caught$)),
        ),
      )
    }),
    map((props: Props) => (
      <>
        <p>This observable stream will fail 1 in 10 times on average</p>
        {props.error ? (
          <>
            {props.retrying ? (
              'Retrying…'
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
          `Counter: ${props.number}`
        )}
      </>
    )),
  )
})

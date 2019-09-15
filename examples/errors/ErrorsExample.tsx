import * as React from 'react'
import {concat, merge, Observable, of, timer} from 'rxjs'
import {catchError, map, switchMapTo, take, tap} from 'rxjs/operators'
import {reactiveComponent, useEvent} from '../../src/reactiveComponent'

const numbers$ = timer(500, 500).pipe(
  tap(() => {
    if (Math.random() > 0.9) {
      throw new Error('Stream failed')
    }
  })
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
      return of({error})
      return merge<Props>(
        of({error}),
        onRetry$.pipe(
          take(1),
          switchMapTo(concat(of<Props>({error, retrying: true}), caught$))
        )
      ) as Observable<Props>
    }),
    map((props: Props) => (
      <>
        <p>The observable stream will fail 1 in 10 times on average</p>
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
    ))
  )
})

import {useMemo} from 'react'
import {useObservable} from 'react-rx'
import {
  mergeMap,
  of,
  Subject,
  throwError,
} from 'rxjs'

import {Counter} from './Counter'

const subject = new Subject<{
  error: boolean
  message: string
}>()

export function Example() {
  const messages = useMemo(
    () =>
      subject
        .asObservable()
        .pipe(
          mergeMap((value) =>
            value.error
              ? throwError(
                  () => new Error(value.message),
                )
              : of(value.message),
          ),
        ),
    [],
  )
  const message = useObservable(
    messages,
    'You did not click the button for: ',
  )

  return (
    <>
      <div>
        {message}
        <Counter />
      </div>
      <button
        type="button"
        onClick={() =>
          subject.next({
            error: true,
            message:
              "You clicked the button, didn't you!?",
          })
        }
      >
        DO NOT CLICK THE BUTTON
      </button>
    </>
  )
}

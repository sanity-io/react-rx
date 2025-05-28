import {render} from '@testing-library/react'
import {mergeMap, of, Subject, throwError} from 'rxjs'
import {expect, test} from 'vitest'

import {useObservable} from '../useObservable.ts'

test('errors emitted by the observable should be thrown during the react render phase', () => {
  const subject = new Subject<{error: boolean; message: string}>()

  const messages = subject
    .asObservable()
    .pipe(
      mergeMap((value) =>
        value.error ? throwError(() => new Error(value.message)) : of(value.message),
      ),
    )

  function ObservableComponent() {
    return useObservable(messages, '☺️')
  }

  const {container, rerender} = render(<ObservableComponent />)
  // no error (yet)
  expect(container).toMatchInlineSnapshot(`
    <div>
      ☺️
    </div>
  `)

  // Note that the error is thrown later, during the render phase
  subject.next({error: true, message: 'Boom'})

  expect(() => rerender(<ObservableComponent />)).toThrowErrorMatchingInlineSnapshot(
    `[Error: Boom]`,
  )
})

import {act, render} from '@testing-library/react'
import React from 'react'
import {mergeMap, of, Subject, throwError} from 'rxjs'
import {expect, test, vitest} from 'vitest'

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

  act(() => {
    // Note that the error is thrown later, during the render phase
    subject.next({error: true, message: 'Boom'})
  })

  const consoleErrorSpy = vitest.spyOn(globalThis.console, 'error').mockImplementation(() => {
    // silence console.error()'s
  })
  expect(() => rerender(<ObservableComponent />)).toThrowErrorMatchingInlineSnapshot(
    `[Error: Boom]`,
  )

  // Assert that react warnings are captured and logged to the console
  // note: this may change with React version
  expect(consoleErrorSpy.mock.calls.flat().join('\n')).toMatchObject(
    expect.stringContaining('Uncaught [Error: Boom]'),
  )
  expect(consoleErrorSpy.mock.calls.flat().join('\n')).toMatchObject(
    expect.stringContaining('The above error occurred in the <ObservableComponent> component'),
  )
})

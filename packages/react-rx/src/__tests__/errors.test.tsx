import {render} from '@testing-library/react'
import {mergeMap, of, Subject, throwError} from 'rxjs'
import {describe, expect, test} from 'vitest'

import {useObservable} from '../useObservable.ts'
import {useSyncObservable} from '../useSyncObservable.ts'

const hooks = [
  {name: 'useObservable', useHook: useObservable},
  {name: 'useSyncObservable', useHook: useSyncObservable},
] as const

describe.each(hooks)(
  '$name: errors emitted by the observable should be thrown during the react render phase',
  ({useHook}) => {
    test('throws during render after an error emission', () => {
      // For useObservable the uSES getSnapshot call throws during the urgent render,
      // before the useDeferredValue line executes.
      const subject = new Subject<{error: boolean; message: string}>()

      const messages = subject
        .asObservable()
        .pipe(
          mergeMap((value) =>
            value.error ? throwError(() => new Error(value.message)) : of(value.message),
          ),
        )

      function ObservableComponent() {
        return useHook(messages, '☺️')
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
  },
)

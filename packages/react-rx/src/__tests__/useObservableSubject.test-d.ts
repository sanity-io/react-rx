import type {ChangeEvent, ChangeEventHandler, MouseEventHandler} from 'react'
import type {Observable} from 'rxjs'
import {expectTypeOf, test} from 'vitest'

import {useObservableSubject} from '../useObservableSubject'

test('the type argument types the observable and handler', () => {
  const [events$, handleEvent] = useObservableSubject<string>()
  expectTypeOf(events$).toEqualTypeOf<Observable<string>>()
  expectTypeOf(handleEvent).toEqualTypeOf<(event: string) => void>()
})

test('the handler only accepts the declared event type', () => {
  const [, handleEvent] = useObservableSubject<number>()
  handleEvent(1)
  // @ts-expect-error - the handler only accepts the declared event type
  handleEvent('a plain string')
})

test('void event streams produce a handler callable without arguments', () => {
  const [events$, handleEvent] = useObservableSubject<void>()
  expectTypeOf(events$).toEqualTypeOf<Observable<void>>()
  handleEvent()
})

test('the handler is assignable to the matching React event prop type', () => {
  const [, handleEvent] = useObservableSubject<ChangeEvent<HTMLInputElement>>()
  expectTypeOf(handleEvent).toExtend<ChangeEventHandler<HTMLInputElement>>()
  expectTypeOf(handleEvent).not.toExtend<MouseEventHandler<HTMLButtonElement>>()
})

test('the observable does not expose Subject methods', () => {
  const [events$] = useObservableSubject<string>()
  // @ts-expect-error - the hook returns an Observable, not the underlying Subject
  events$.next('nope')
})

import type {ChangeEvent} from 'react'
import {map, type Observable} from 'rxjs'
import {expectTypeOf, test} from 'vitest'

import {useObservableEvent} from '../useObservableEvent'

test('infers the event argument type from the handler observable parameter', () => {
  const onEvent = useObservableEvent((events$: Observable<string>) =>
    events$.pipe(map((value) => value.length)),
  )
  expectTypeOf(onEvent).toEqualTypeOf<(arg: string) => void>()
})

test('the returned callback returns void regardless of the pipeline output type', () => {
  const onEvent = useObservableEvent((events$: Observable<number>) => events$.pipe(map(String)))
  expectTypeOf(onEvent).parameter(0).toEqualTypeOf<number>()
  expectTypeOf(onEvent).returns.toBeVoid()
})

test('the handler must return an observable', () => {
  // @ts-expect-error - the handler must return an Observable
  useObservableEvent((events$: Observable<string>) => 'not an observable')
})

test('void event streams produce a callback that can be called without arguments', () => {
  const onEvent = useObservableEvent((events$: Observable<void>) => events$)
  expectTypeOf(onEvent).toEqualTypeOf<(arg: void) => void>()
  onEvent()
})

test('React change events flow through fully typed (DocumentListPane pattern)', () => {
  const handleQueryChange = useObservableEvent(
    (event$: Observable<ChangeEvent<HTMLInputElement>>) =>
      event$.pipe(map((event) => event.target.value)),
  )
  expectTypeOf(handleQueryChange).parameter(0).toEqualTypeOf<ChangeEvent<HTMLInputElement>>()

  // @ts-expect-error - the callback only accepts the inferred event type
  handleQueryChange('a plain string')
})

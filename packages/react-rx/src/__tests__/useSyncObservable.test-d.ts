import {of} from 'rxjs'
import {expectTypeOf, test} from 'vitest'

import {useSyncObservable} from '../useSyncObservable'

test('useSyncObservable requires an initialValue', () => {
  const observable = of('foo')

  //@ts-expect-error - initialValue is required; use useObservablePromise when there is none
  useSyncObservable(observable)
})

test('an explicit undefined initialValue is valid and widens the return type', () => {
  const observable = of('foo')

  expectTypeOf(useSyncObservable(observable, undefined)).toEqualTypeOf<string | undefined>()
})

test('return type of useSyncObservable with initial value is not undefined', () => {
  const observable = of('foo')
  //@ts-expect-error - because initial value is given, the return type can never be undefined
  expectTypeOf(useSyncObservable(observable, 'bar')).toEqualTypeOf<string | undefined>()
})

test('useSyncObservable with initial value if a different type returns a union of the observed type and the initial value type', () => {
  const observable = of('foo')

  expectTypeOf(useSyncObservable(observable, 1)).toEqualTypeOf<string | number>()
  expectTypeOf(useSyncObservable(observable, () => 1)).toEqualTypeOf<string | number>()
  expectTypeOf(useSyncObservable(observable, 'foo')).toEqualTypeOf<string>()
})

const double = (n: number) => n * 2

test('a function initial value is provided through an initializer, like useState', () => {
  const observable = of((n: number) => n + 1)

  expectTypeOf(useSyncObservable(observable, () => double)).toEqualTypeOf<(n: number) => number>()
})

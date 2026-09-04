import {of} from 'rxjs'
import {expectTypeOf, test} from 'vitest'

import {useObservable} from '../useObservable'

test('useObservable requires an initialValue', () => {
  const observable = of('foo')

  //@ts-expect-error - initialValue is required; use useObservablePromise when there is none
  useObservable(observable)
})

test('an explicit undefined initialValue is valid and widens the return type', () => {
  const observable = of('foo')

  expectTypeOf(useObservable(observable, undefined)).toEqualTypeOf<string | undefined>()
})

test('return type of useObservable with initial value is not undefined', () => {
  const observable = of('foo')
  //@ts-expect-error - because initial value is given, the return type can never be undefined
  expectTypeOf(useObservable(observable, 'bar')).toEqualTypeOf<string | undefined>()
})

test('useObservable with initial value if a different type returns a union of the observed type and the initial value type', () => {
  const observable = of('foo')

  expectTypeOf(useObservable(observable, 1)).toEqualTypeOf<string | number>()
  expectTypeOf(useObservable(observable, () => 1)).toEqualTypeOf<string | number>()
  expectTypeOf(useObservable(observable, 'foo')).toEqualTypeOf<string>()
})

const double = (n: number) => n * 2

test('a function initial value is provided through an initializer, like useState', () => {
  const observable = of((n: number) => n + 1)

  expectTypeOf(useObservable(observable, () => double)).toEqualTypeOf<(n: number) => number>()
})

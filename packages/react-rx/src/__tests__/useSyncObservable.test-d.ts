import {of} from 'rxjs'
import {expectTypeOf, test} from 'vitest'

import {useSyncObservable} from '../useSyncObservable'

test('useSyncObservable with no initial value can be undefined', () => {
  const observable = of('foo')

  expectTypeOf(useSyncObservable(observable)).toEqualTypeOf<string | undefined>()

  //@ts-expect-error - because initial value is not given, we can't guarantee the observable emits a sync value, so it could be undefined
  expectTypeOf(useSyncObservable(observable)).toEqualTypeOf<string>()
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

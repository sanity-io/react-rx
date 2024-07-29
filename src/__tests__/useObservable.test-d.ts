import {of} from 'rxjs'
import {expectTypeOf, test} from 'vitest'

import {useObservable} from '../useObservable'

test('useObservable with no initial value can be undefined', () => {
  const observable = of('foo')

  expectTypeOf(useObservable(observable)).toEqualTypeOf<string | undefined>()

  //@ts-expect-error - because initial value is not given, we can't guarantee the observable emits a sync value, so it could be undefined
  expectTypeOf(useObservable(observable)).toEqualTypeOf<string>()
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

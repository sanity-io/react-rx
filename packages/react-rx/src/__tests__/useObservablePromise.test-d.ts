import {use} from 'react'
import {of} from 'rxjs'
import {expectTypeOf, test} from 'vitest'

import {
  preloadObservablePromise,
  useObservablePromise,
  type ObservablePromise,
  type UseObservablePromiseOptions,
} from '../useObservablePromise'

test('useObservablePromise returns ObservablePromise<T> assignable to Promise<T>', () => {
  const observable = of('foo')
  const result = useObservablePromise(observable)
  expectTypeOf(result).toEqualTypeOf<ObservablePromise<string>>()
  expectTypeOf(result).toMatchTypeOf<Promise<string>>()
})

test('use(result) yields T', () => {
  const promise = useObservablePromise(of(123))
  const value = use(promise)
  expectTypeOf(value).toEqualTypeOf<number>()
})

test('status discriminant narrows value and reason', () => {
  const promise = useObservablePromise(of('x'))
  if (promise.status === 'fulfilled') {
    expectTypeOf(promise.value).toEqualTypeOf<string>()
  }
  if (promise.status === 'rejected') {
    expectTypeOf(promise.reason).toEqualTypeOf<unknown>()
  }
  if (promise.status === 'pending') {
    // @ts-expect-error pending promises have no value
    expectTypeOf(promise.value).toEqualTypeOf<string>()
  }
})

test('options accept disabled and ttl', () => {
  const options: UseObservablePromiseOptions = {disabled: true, ttl: 1000}
  useObservablePromise(of(1), options)
})

test('preloadObservablePromise returns ObservablePromise<T>', () => {
  const result = preloadObservablePromise(of('pre'))
  expectTypeOf(result).toEqualTypeOf<ObservablePromise<string>>()
})

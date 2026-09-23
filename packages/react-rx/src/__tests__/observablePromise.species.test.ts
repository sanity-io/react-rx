import {afterEach, beforeEach, expect, test} from 'vitest'

import {ObservablePromiseImpl} from '../observablePromise'

// Hermes (React Native) does not honor `Symbol.species` for Promise subclasses:
// `.then()` builds the derived promise with `this.constructor`. Simulate that by
// pointing the species getter back at the subclass itself.
// https://github.com/sanity-io/react-rx/issues/626
const speciesDescriptor = Object.getOwnPropertyDescriptor(ObservablePromiseImpl, Symbol.species)!

beforeEach(() => {
  void Object.defineProperty(ObservablePromiseImpl, Symbol.species, {
    configurable: true,
    get: () => ObservablePromiseImpl,
  })
})

afterEach(() => {
  void Object.defineProperty(ObservablePromiseImpl, Symbol.species, speciesDescriptor)
})

test('constructing does not recurse when species is ignored', () => {
  const promise = new ObservablePromiseImpl<string>()
  expect(promise.status).toBe('pending')
})

test('then() chains still settle when species is ignored', async () => {
  const pending = new ObservablePromiseImpl<string>()
  const derived = pending.then((value) => `${value}!`)
  pending.fulfill('ok')
  await expect(derived).resolves.toBe('ok!')

  await expect(ObservablePromiseImpl.fulfilled(1).then((value) => value + 1)).resolves.toBe(2)
  await expect(ObservablePromiseImpl.rejected(new Error('boom'))).rejects.toThrow('boom')
})

test('a rejected promise nobody consumes stays quiet when species is ignored', async () => {
  const unhandled: unknown[] = []
  const onUnhandled = (reason: unknown) => unhandled.push(reason)
  process.on('unhandledRejection', onUnhandled)
  try {
    const promise = new ObservablePromiseImpl<string>()
    promise.rejectWith(new Error('nobody listens'))
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(promise.status).toBe('rejected')
    expect(unhandled).toEqual([])
  } finally {
    process.off('unhandledRejection', onUnhandled)
  }
})

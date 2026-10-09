import {expect, test} from 'vitest'

import {ObservablePromiseImpl} from '../observablePromise'

/**
 * The contract of the `use()` thenable, stated without reference to how it is
 * built or to what the engine does with `Promise` subclasses: react-rx owns
 * `status` / `value` / `reason` on the instances it creates, and whatever is
 * derived from one through `then` / `catch` / `finally` is a plain `Promise`
 * that React or the engine instruments on its own. The `hermes-promise`
 * vitest project runs this file again with React Native's species-less
 * `Promise.prototype.then` installed (#626).
 */

function noop() {}

test('starts pending and fulfills in place', async () => {
  const promise = new ObservablePromiseImpl<string>()
  expect(promise.status).toBe('pending')
  expect(promise.value).toBeUndefined()

  promise.fulfill('ok')
  expect(promise.status).toBe('fulfilled')
  expect(promise.value).toBe('ok')
  await expect(promise).resolves.toBe('ok')
})

test('rejects in place', async () => {
  const promise = new ObservablePromiseImpl<string>()
  const reason = new Error('boom')

  promise.rejectWith(reason)
  expect(promise.status).toBe('rejected')
  expect(promise.reason).toBe(reason)
  await expect(promise).rejects.toBe(reason)
})

test('the first settlement wins', async () => {
  const fulfilled = new ObservablePromiseImpl<string>()
  fulfilled.fulfill('first')
  fulfilled.fulfill('second')
  fulfilled.rejectWith(new Error('late'))
  expect(fulfilled.status).toBe('fulfilled')
  expect(fulfilled.value).toBe('first')
  await expect(fulfilled).resolves.toBe('first')

  const rejected = new ObservablePromiseImpl<string>()
  rejected.rejectWith(new Error('first'))
  rejected.fulfill('late')
  expect(rejected.status).toBe('rejected')
  expect(rejected.reason).toEqual(new Error('first'))
  await expect(rejected).rejects.toThrow('first')
})

test('fulfilled() and rejected() are settled on creation', async () => {
  const fulfilled = ObservablePromiseImpl.fulfilled(1)
  expect(fulfilled.status).toBe('fulfilled')
  expect(fulfilled.value).toBe(1)
  await expect(fulfilled).resolves.toBe(1)

  const rejected = ObservablePromiseImpl.rejected(new Error('boom'))
  expect(rejected.status).toBe('rejected')
  expect(rejected.reason).toEqual(new Error('boom'))
  await expect(rejected).rejects.toThrow('boom')
})

test('derived promises are plain Promises that carry no instrumentation', async () => {
  const pending = new ObservablePromiseImpl<string>()
  const roots = [
    pending,
    ObservablePromiseImpl.fulfilled('ok'),
    ObservablePromiseImpl.rejected(new Error('boom')),
  ]
  for (const root of roots) {
    const derived = [root.then(noop), root.then(noop, noop), root.catch(noop), root.finally(noop)]
    for (const promise of derived) {
      // React's `trackUsedThenable` only instruments a thenable without a
      // string `status`; an engine-built subclass instance would be born with
      // `status: 'pending'` and never advance, leaving `use()` suspended.
      expect(Object.getPrototypeOf(promise)).toBe(Promise.prototype)
      expect(promise).not.toBeInstanceOf(ObservablePromiseImpl)
      expect('status' in promise).toBe(false)
      // Nobody consumes these; keep the rejecting ones out of unhandled-rejection reporting.
      promise.catch(noop)
    }
  }
  pending.fulfill('ok')
  await Promise.all(roots.map((root) => root.catch(noop)))
})

test('then() chains on pending, fulfilled and rejected roots settle', async () => {
  const pending = new ObservablePromiseImpl<string>()
  const derived = pending.then((value) => `${value}!`)
  pending.fulfill('ok')
  await expect(derived).resolves.toBe('ok!')

  await expect(ObservablePromiseImpl.fulfilled(1).then((value) => value + 1)).resolves.toBe(2)
  await expect(
    ObservablePromiseImpl.rejected(new Error('boom')).then(noop, (reason: Error) => reason.message),
  ).resolves.toBe('boom')
  await expect(
    ObservablePromiseImpl.rejected(new Error('boom')).catch((reason: Error) => reason.message),
  ).resolves.toBe('boom')

  const finalized: string[] = []
  await ObservablePromiseImpl.fulfilled('done').finally(() => {
    finalized.push('finally')
  })
  expect(finalized).toEqual(['finally'])
})

test('interoperates with await and Promise combinators', async () => {
  expect(await ObservablePromiseImpl.fulfilled('a')).toBe('a')
  await expect(
    Promise.all([ObservablePromiseImpl.fulfilled('a'), ObservablePromiseImpl.fulfilled('b')]),
  ).resolves.toEqual(['a', 'b'])
  await expect(Promise.resolve(ObservablePromiseImpl.fulfilled('c'))).resolves.toBe('c')
  await expect(ObservablePromiseImpl.rejected(new Error('boom')).then(noop)).rejects.toThrow('boom')
})

test('a rejected promise nobody consumes stays quiet', async () => {
  const unhandled: unknown[] = []
  const onUnhandled = (reason: unknown) => unhandled.push(reason)
  process.on('unhandledRejection', onUnhandled)
  try {
    const promise = new ObservablePromiseImpl<string>()
    promise.rejectWith(new Error('nobody listens'))
    ObservablePromiseImpl.rejected(new Error('nobody listens either'))
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(promise.status).toBe('rejected')
    expect(unhandled).toEqual([])
  } finally {
    process.off('unhandledRejection', onUnhandled)
  }
})

test('is a thenable, not a Promise subclass', () => {
  // Deliberate: only a subclass hands derived-promise construction to the
  // engine, which is the mechanism Hermes gets wrong. `use()`, `await` and the
  // Promise combinators all go through `then`, never `instanceof`.
  const promise = new ObservablePromiseImpl<string>()
  expect(typeof promise.then).toBe('function')
  expect(promise).not.toBeInstanceOf(Promise)
  expect(Object.prototype.toString.call(promise)).toBe('[object ObservablePromise]')
})

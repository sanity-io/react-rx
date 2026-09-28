import {act, render, screen} from '@testing-library/react'
import {Suspense, use, version as reactVersion, type ReactNode} from 'react'
import {defer, from, Observable, of} from 'rxjs'
import {describe, expect, test} from 'vitest'

import {preloadObservablePromise, useObservablePromise} from '../useObservablePromise'

// React 19.3's `trackUsedThenable` keeps a thenable passed to `use()` reachable after the component
// that read it unmounts. That retain is React's, not a react-rx cache leak, so the collectability
// assertions below can only read the promise with `use()` on older React — which the `react-19.2`
// vitest project provides. Gating on the version (not the project name) keeps a single-project run
// correct too.
const [reactMajor = 0, reactMinor = 0] = reactVersion.split('.').map(Number)
const reactRetainsUsedThenables = reactMajor > 19 || (reactMajor === 19 && reactMinor >= 3)

async function renderAsync(ui: ReactNode) {
  let result!: ReturnType<typeof render>
  await act(async () => {
    result = render(ui)
  })
  return result
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function forceGC() {
  // Exposed by `--expose-gc`, passed to the worker processes via `execArgv` in vitest.config.ts.
  const {gc} = globalThis as {gc?: () => void}
  if (typeof gc !== 'function') {
    throw new TypeError(
      'Expected `globalThis.gc` to be available — is `--expose-gc` missing from `execArgv` in vitest.config.ts?',
    )
  }
  // A WeakRef target is kept alive until the end of the job it was created/dereferenced in, and a single
  // pass isn't always enough to collect the whole graph, so yield to the macrotask queue between passes.
  for (let i = 0; i < 5; i++) {
    // oxlint-disable-next-line no-await-in-loop -- GC passes must run sequentially
    await wait(0)
    gc()
  }
}

function Reader({promise}: {promise: Promise<string>}) {
  const value = use(promise)
  return <div data-testid="v">{value}</div>
}

function PayloadReader({promise}: {promise: Promise<{payload: string}>}) {
  return <>{use(promise).payload.length}</>
}

test('sync termination does not leave a poisoned cache entry', async () => {
  const observable = of('sync')

  function Owner() {
    const p = useObservablePromise(observable, {ttl: 20})
    return (
      <Suspense fallback={<div>loading</div>}>
        <Reader promise={p} />
      </Suspense>
    )
  }

  const {unmount} = await renderAsync(<Owner />)
  expect(screen.getByTestId('v').textContent).toBe('sync')
  unmount()
  await wait(40)

  // Remount after eviction should succeed (fresh subscription), not replay a
  // stale error or hang.
  await renderAsync(<Owner />)
  expect(screen.getByTestId('v').textContent).toBe('sync')
})

test('preloaded-never-consumed entry is torn down after ttl', async () => {
  let active = 0
  const observable = new Observable<string>((subscriber) => {
    active++
    subscriber.next('p')
    // Keep the source open so teardown is observable via the unsubscribe hook.
    return () => {
      active--
    }
  })

  void preloadObservablePromise(observable, {ttl: 40})
  expect(active).toBe(1)
  await wait(70)
  expect(active).toBe(0)
})

async function expectReleasedAfterUnmountAndTtl(
  read: (promise: Promise<{payload: string}>) => ReactNode,
) {
  let valueRef: WeakRef<object> | undefined
  const promiseRefs: WeakRef<object>[] = []
  // Long-lived source (as if declared at module scope). It emits a fresh
  // payload object per subscription and completes synchronously.
  const source = defer(() => {
    const value = {payload: 'x'.repeat(1024)}
    valueRef = new WeakRef(value)
    return of(value)
  })

  function Owner() {
    const promise = useObservablePromise(source, {ttl: 20})
    promiseRefs.push(new WeakRef(promise))
    return read(promise)
  }

  const {unmount} = await renderAsync(<Owner />)
  unmount()
  // Let the eviction timer fire, releasing the cache entry (which retains both
  // the instrumented promise and, through it, the settled value).
  await wait(50)

  await forceGC()

  expect(valueRef!.deref()).toBeUndefined()
  expect(promiseRefs.length).toBeGreaterThan(0)
  for (const promiseRef of promiseRefs) {
    expect(promiseRef.deref()).toBeUndefined()
  }
  // Keep the source — the WeakMap key — strongly reachable across the GC above, so the value can
  // only have been released through eviction, not by the key getting collected.
  expect(source).toBeInstanceOf(Observable)
}

describe('releases the settled value and promise after unmount and ttl expiry', () => {
  // Only the hook pins the promise here, so this holds on every React version.
  test('when the promise is never read', () => expectReleasedAfterUnmountAndTtl(() => null))

  // The stronger check: the value was also handed to React through `use()`. Skipped where React
  // itself retains the thenable, see `reactRetainsUsedThenables`.
  test.skipIf(reactRetainsUsedThenables)(
    'when the promise was read with use() under Suspense',
    () =>
      expectReleasedAfterUnmountAndTtl((promise) => (
        <Suspense fallback={null}>
          <PayloadReader promise={promise} />
        </Suspense>
      )),
  )
})

test('releases a preloaded-never-consumed value after ttl expiry', async () => {
  let valueRef: WeakRef<object> | undefined
  const source = defer(() => {
    const value = {payload: 'x'.repeat(1024)}
    valueRef = new WeakRef(value)
    return of(value)
  })

  void preloadObservablePromise(source, {ttl: 20})
  await wait(50)

  await forceGC()

  expect(valueRef!.deref()).toBeUndefined()
  expect(source).toBeInstanceOf(Observable)
})

test('unmount after async settle allows remount after ttl to refetch', async () => {
  let subscriptions = 0
  const resolvers: Array<(value: string) => void> = []
  const observable = defer(() => {
    subscriptions++
    return from(
      new Promise<string>((r) => {
        resolvers.push(r)
      }),
    )
  })

  function Owner() {
    const p = useObservablePromise(observable, {ttl: 40})
    return (
      <Suspense fallback={<div data-testid="fallback">loading</div>}>
        <Reader promise={p} />
      </Suspense>
    )
  }

  const {unmount} = await renderAsync(<Owner />)
  await act(async () => {
    resolvers[0]!('one')
  })
  expect(screen.getByTestId('v').textContent).toBe('one')
  unmount()
  await wait(70)

  await renderAsync(<Owner />)
  expect(screen.getByTestId('fallback')).toBeTruthy()
  expect(subscriptions).toBe(2)
  await act(async () => {
    resolvers[1]!('two')
  })
  expect(screen.getByTestId('v').textContent).toBe('two')
})

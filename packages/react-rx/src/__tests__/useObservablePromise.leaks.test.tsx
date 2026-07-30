import {act, render, screen} from '@testing-library/react'
import {Suspense, use, type ReactNode} from 'react'
import {defer, from, Observable, of} from 'rxjs'
import {expect, test} from 'vitest'

import {preloadObservablePromise, useObservablePromise} from '../useObservablePromise'

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

test('sync termination does not leave a poisoned cache entry', async () => {
  const observable = of('sync')

  function Child() {
    const value = use(useObservablePromise(observable, {ttl: 20}))
    return <div data-testid="v">{value}</div>
  }

  const {unmount} = await renderAsync(
    <Suspense fallback={<div>loading</div>}>
      <Child />
    </Suspense>,
  )
  expect(screen.getByTestId('v').textContent).toBe('sync')
  unmount()
  await wait(40)

  // Remount after eviction should succeed (fresh subscription), not replay a
  // stale error or hang.
  await renderAsync(
    <Suspense fallback={<div>loading</div>}>
      <Child />
    </Suspense>,
  )
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

test('releases the settled value and promise after unmount and ttl expiry', async () => {
  let valueRef: WeakRef<object> | undefined
  const promiseRefs: WeakRef<object>[] = []
  // Long-lived source (as if declared at module scope). It emits a fresh
  // payload object per subscription and completes synchronously.
  const source = defer(() => {
    const value = {payload: 'x'.repeat(1024)}
    valueRef = new WeakRef(value)
    return of(value)
  })

  function Child() {
    const promise = useObservablePromise(source, {ttl: 20})
    promiseRefs.push(new WeakRef(promise))
    return <>{use(promise).payload.length}</>
  }

  const {unmount} = await renderAsync(
    <Suspense fallback={null}>
      <Child />
    </Suspense>,
  )
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

  function Child() {
    const value = use(useObservablePromise(observable, {ttl: 40}))
    return <div data-testid="v">{value}</div>
  }

  const {unmount} = await renderAsync(
    <Suspense fallback={<div>loading</div>}>
      <Child />
    </Suspense>,
  )
  await act(async () => {
    resolvers[0]!('one')
  })
  expect(screen.getByTestId('v').textContent).toBe('one')
  unmount()
  await wait(70)

  await renderAsync(
    <Suspense fallback={<div data-testid="fallback">loading</div>}>
      <Child />
    </Suspense>,
  )
  expect(screen.getByTestId('fallback')).toBeTruthy()
  expect(subscriptions).toBe(2)
  await act(async () => {
    resolvers[1]!('two')
  })
  expect(screen.getByTestId('v').textContent).toBe('two')
})

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

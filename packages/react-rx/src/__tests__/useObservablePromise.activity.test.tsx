import {act, render, screen, waitFor} from '@testing-library/react'
import {Activity, Suspense, use, useState, type ReactNode} from 'react'
import {defer, from, Observable, Subject} from 'rxjs'
import {expect, test} from 'vitest'

import {useObservablePromise} from '../useObservablePromise'

/**
 * Documents how `useObservablePromise` interacts with React 19.2's `<Activity>`.
 *
 * Unlike `useObservable` (built on `useSyncExternalStore` + effects), this hook
 * returns a Promise read with `use()`, which Activity pre-rendering *does*
 * detect — so hidden boundaries can start fetching before they become visible.
 *
 * @see https://react.dev/reference/react/Activity#pre-rendering-content-thats-likely-to-become-visible
 */

async function renderAsync(ui: ReactNode) {
  let result!: ReturnType<typeof render>
  await act(async () => {
    result = render(ui)
  })
  return result
}

function Fallback({onRender}: {onRender?: () => void}) {
  onRender?.()
  return <div data-testid="fallback">loading</div>
}

function ToggleActivity({children}: {children: ReactNode}) {
  const [mode, setMode] = useState<'visible' | 'hidden'>('visible')
  return (
    <>
      <button
        type="button"
        onClick={() => setMode((m) => (m === 'visible' ? 'hidden' : 'visible'))}
      >
        toggle
      </button>
      <Activity mode={mode}>{children}</Activity>
    </>
  )
}

async function toggle() {
  await act(async () => {
    screen.getByRole('button', {name: 'toggle'}).click()
  })
}

test('hidden Activity pre-render starts the source subscription without effects', async () => {
  let subscriptions = 0
  let resolve!: (value: string) => void
  const promise = new Promise<string>((r) => {
    resolve = r
  })
  const observable = defer(() => {
    subscriptions++
    return from(promise)
  })

  function Child() {
    const value = use(useObservablePromise(observable))
    return <div data-testid="value">{value}</div>
  }

  await renderAsync(
    <Activity mode="hidden">
      <Suspense fallback={<Fallback />}>
        <Child />
      </Suspense>
    </Activity>,
  )

  // Eager render-phase resolver starts the fetch even while hidden.
  expect(subscriptions).toBe(1)

  await act(async () => {
    resolve('prefetched')
    await promise
  })

  // Still hidden — content may be in the DOM with display:none once resolved.
  await waitFor(() => {
    const el = screen.queryByTestId('value')
    expect(el?.textContent).toBe('prefetched')
  })
})

test('promise that resolves while hidden appears without fallback on reveal', async () => {
  let resolve!: (value: string) => void
  const promise = new Promise<string>((r) => {
    resolve = r
  })
  const observable = defer(() => from(promise))
  let fallbackCount = 0

  function Child() {
    const value = use(useObservablePromise(observable))
    return <div data-testid="value">{value}</div>
  }

  const {rerender} = await renderAsync(
    <Activity mode="hidden">
      <Suspense fallback={<Fallback onRender={() => fallbackCount++} />}>
        <Child />
      </Suspense>
    </Activity>,
  )

  await act(async () => {
    resolve('ready')
    await promise
  })
  await waitFor(() => expect(screen.getByTestId('value').textContent).toBe('ready'))
  const fallbacksWhileHidden = fallbackCount

  await act(async () => {
    rerender(
      <Activity mode="visible">
        <Suspense fallback={<Fallback onRender={() => fallbackCount++} />}>
          <Child />
        </Suspense>
      </Activity>,
    )
  })

  expect(screen.getByTestId('value').textContent).toBe('ready')
  // Reveal must not re-activate Suspense.
  expect(fallbackCount).toBe(fallbacksWhileHidden)
})

test('visible Activity hide/show preserves fulfilled value across toggles', async () => {
  let resolve!: (value: string) => void
  const promise = new Promise<string>((r) => {
    resolve = r
  })
  const observable = defer(() => from(promise))

  function Child() {
    const value = use(useObservablePromise(observable, {ttl: 500}))
    return <div data-testid="value">{value}</div>
  }

  await renderAsync(
    <ToggleActivity>
      <Suspense fallback={<Fallback />}>
        <Child />
      </Suspense>
    </ToggleActivity>,
  )

  await act(async () => {
    resolve('fetched')
    await promise
  })
  await waitFor(() => expect(screen.getByTestId('value').textContent).toBe('fetched'))

  await toggle()
  expect(screen.getByTestId('value').textContent).toBe('fetched')

  await toggle()
  expect(screen.getByTestId('value').textContent).toBe('fetched')
})

test('long-lived source: share retention keeps the connection during ttl, so hidden emissions update the cache', async () => {
  const subject = new Subject<string>()
  let subscriptions = 0
  const observable = new Observable<string>((subscriber) => {
    subscriptions++
    const sub = subject.subscribe(subscriber)
    return () => sub.unsubscribe()
  })

  function Child() {
    const value = use(useObservablePromise(observable, {ttl: 200}))
    return <div data-testid="value">{value}</div>
  }

  await renderAsync(
    <ToggleActivity>
      <Suspense fallback={<Fallback />}>
        <Child />
      </Suspense>
    </ToggleActivity>,
  )

  await act(async () => {
    subject.next('visible-1')
  })
  await waitFor(() => expect(screen.getByTestId('value').textContent).toBe('visible-1'))
  expect(subscriptions).toBe(1)

  await toggle()
  // Unlike useObservable (which drops the source immediately), the TTL share
  // retention keeps the multicast alive briefly — emissions during that window
  // update the cached promise so reveal can show the latest value.
  await act(async () => {
    subject.next('hidden-cached')
  })

  await toggle()
  expect(screen.getByTestId('value').textContent).toBe('hidden-cached')
  await act(async () => {
    subject.next('visible-2')
  })
  await waitFor(() => expect(screen.getByTestId('value').textContent).toBe('visible-2'))
})

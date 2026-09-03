import {act, render, screen, waitFor} from '@testing-library/react'
import {StrictMode, Suspense, use, type ReactNode} from 'react'
import {defer, from, Observable} from 'rxjs'
import {expect, test} from 'vitest'

import {useObservablePromise} from '../useObservablePromise'

async function renderAsync(ui: ReactNode) {
  let result!: ReturnType<typeof render>
  await act(async () => {
    result = render(ui)
  })
  return result
}

function Reader({promise}: {promise: Promise<string>}) {
  const value = use(promise)
  return <div data-testid="value">{value}</div>
}

test('StrictMode double effects do not double-subscribe beyond the share contract', async () => {
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
    <StrictMode>
      <Suspense fallback={<div>loading</div>}>
        <Child />
      </Suspense>
    </StrictMode>,
  )

  // StrictMode runs subscribe → unsubscribe → resubscribe; share + retention
  // must collapse that to a single source subscription.
  expect(subscriptions).toBe(1)

  await act(async () => {
    resolve('strict')
    await promise
  })
  await waitFor(() => expect(screen.getByTestId('value').textContent).toBe('strict'))
  expect(subscriptions).toBe(1)
})

test('StrictMode keeps a stable promise identity across double renders and effects', async () => {
  const identities: Promise<string>[] = []
  const observable = new Observable<string>((subscriber) => {
    subscriber.next('sync')
  })

  function Owner() {
    const p = useObservablePromise(observable)
    identities.push(p)
    return (
      <Suspense fallback={<div>loading</div>}>
        <Reader promise={p} />
      </Suspense>
    )
  }

  await renderAsync(
    <StrictMode>
      <Owner />
    </StrictMode>,
  )

  expect(screen.getByTestId('value').textContent).toBe('sync')
  expect(identities.length).toBeGreaterThanOrEqual(1)
  expect(new Set(identities).size).toBe(1)
})

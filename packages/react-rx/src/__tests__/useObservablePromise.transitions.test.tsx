import {act, render, screen, waitFor} from '@testing-library/react'
import {Suspense, use, useDeferredValue, useState, useTransition, type ReactNode} from 'react'
import {defer, from} from 'rxjs'
import {expect, test} from 'vitest'

import {preloadObservablePromise, useObservablePromise} from '../useObservablePromise'

/**
 * Demonstrates the transition/deferred swap constraint that follows from
 * commit-driven fetching: rendering never subscribes the source, and a
 * transition (or useDeferredValue) render that suspends is thrown away
 * without committing. Swapping to a cold observable inside a transition
 * therefore deadlocks — the suspended render can never start the fetch that
 * would unblock it. Warming the target first (`preloadObservablePromise` in
 * the event handler) is required; a plain sync swap does not have the
 * problem because it commits the Suspense fallback, and that commit starts
 * the fetch.
 */

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

function Fallback() {
  return <div data-testid="fallback">loading</div>
}

function Reader({promise}: {promise: Promise<string>}) {
  const value = use(promise)
  return <div data-testid="value">{value}</div>
}

/** A cold source whose subscription count and settlement are observable. */
function trackedObservable() {
  let resolve!: (value: string) => void
  const promise = new Promise<string>((r) => {
    resolve = r
  })
  let subscriptions = 0
  const observable = defer(() => {
    subscriptions++
    return from(promise)
  })
  return {
    observable,
    resolve,
    get subscriptions() {
      return subscriptions
    },
  }
}

test('baseline: a sync swap suspends into the fallback, whose commit starts the fetch', async () => {
  const a = trackedObservable()
  const b = trackedObservable()

  function Parent() {
    const [obs, setObs] = useState(a.observable)
    const promise = useObservablePromise(obs)
    return (
      <>
        <button type="button" onClick={() => setObs(b.observable)}>
          swap
        </button>
        <Suspense fallback={<Fallback />}>
          <Reader promise={promise} />
        </Suspense>
      </>
    )
  }

  await renderAsync(<Parent />)
  await act(async () => {
    a.resolve('A')
  })
  await waitFor(() => expect(screen.getByTestId('value').textContent).toBe('A'))

  await act(async () => {
    screen.getByRole('button', {name: 'swap'}).click()
  })
  // A sync update must show the fallback — and committing it also re-runs the
  // hook caller's store subscription with the new entry, starting the fetch.
  expect(screen.getByTestId('fallback')).toBeTruthy()
  expect(b.subscriptions).toBe(1)

  await act(async () => {
    b.resolve('B')
  })
  await waitFor(() => expect(screen.getByTestId('value').textContent).toBe('B'))
})

test('startTransition swap without preload stalls forever: the suspended transition render never commits, so the fetch never starts', async () => {
  const a = trackedObservable()
  const b = trackedObservable()

  function Parent() {
    const [isPending, startTransition] = useTransition()
    const [obs, setObs] = useState(a.observable)
    const promise = useObservablePromise(obs)
    return (
      <>
        <button type="button" onClick={() => startTransition(() => setObs(b.observable))}>
          swap
        </button>
        <span data-testid="pending">{String(isPending)}</span>
        <Suspense fallback={<Fallback />}>
          <Reader promise={promise} />
        </Suspense>
      </>
    )
  }

  await renderAsync(<Parent />)
  await act(async () => {
    a.resolve('A')
  })
  await waitFor(() => expect(screen.getByTestId('value').textContent).toBe('A'))

  await act(async () => {
    screen.getByRole('button', {name: 'swap'}).click()
  })

  // The transition rendered, suspended on the new entry's pending promise and
  // was discarded without committing — the new source was never subscribed.
  expect(b.subscriptions).toBe(0)
  // Transition semantics keep the old content up (no committed fallback), so
  // the UI just hangs in the pending state.
  expect(screen.getByTestId('value').textContent).toBe('A')
  expect(screen.getByTestId('pending').textContent).toBe('true')
  expect(screen.queryByTestId('fallback')).toBeNull()

  // Waiting cannot help: with no subscriber the promise can never settle, so
  // React is never pinged to retry the transition.
  await act(async () => {
    await wait(150)
  })
  expect(b.subscriptions).toBe(0)
  expect(screen.getByTestId('pending').textContent).toBe('true')

  // Even the underlying data becoming available cannot rescue it — the
  // observable was never subscribed, so nothing observes the settlement.
  await act(async () => {
    b.resolve('B')
    await wait(50)
  })
  expect(screen.getByTestId('value').textContent).toBe('A')
  expect(screen.getByTestId('pending').textContent).toBe('true')
})

test('preloading the target in the event handler lets the startTransition swap resolve without a fallback', async () => {
  const a = trackedObservable()
  const b = trackedObservable()

  function Parent() {
    const [isPending, startTransition] = useTransition()
    const [obs, setObs] = useState(a.observable)
    const promise = useObservablePromise(obs)
    return (
      <>
        <button
          type="button"
          onClick={() => {
            // The event handler is the commit-independent place to start the
            // fetch; the transition then merely waits for it.
            void preloadObservablePromise(b.observable)
            startTransition(() => setObs(b.observable))
          }}
        >
          swap
        </button>
        <span data-testid="pending">{String(isPending)}</span>
        <Suspense fallback={<Fallback />}>
          <Reader promise={promise} />
        </Suspense>
      </>
    )
  }

  await renderAsync(<Parent />)
  await act(async () => {
    a.resolve('A')
  })
  await waitFor(() => expect(screen.getByTestId('value').textContent).toBe('A'))

  await act(async () => {
    screen.getByRole('button', {name: 'swap'}).click()
  })
  // The preload started the (single) fetch; the transition keeps the old
  // content visible while it is in flight.
  expect(b.subscriptions).toBe(1)
  expect(screen.getByTestId('value').textContent).toBe('A')
  expect(screen.getByTestId('pending').textContent).toBe('true')

  await act(async () => {
    b.resolve('B')
  })
  await waitFor(() => expect(screen.getByTestId('value').textContent).toBe('B'))
  expect(screen.getByTestId('pending').textContent).toBe('false')
  // The swap never committed the Suspense fallback.
  expect(screen.queryByTestId('fallback')).toBeNull()
  expect(b.subscriptions).toBe(1)
})

test('useDeferredValue swap without preload stalls forever: the suspended deferred render never commits, so the fetch never starts', async () => {
  const a = trackedObservable()
  const b = trackedObservable()

  function Parent() {
    const [obs, setObs] = useState(a.observable)
    const deferred = useDeferredValue(obs)
    const promise = useObservablePromise(deferred)
    return (
      <>
        <button type="button" onClick={() => setObs(b.observable)}>
          swap
        </button>
        <span data-testid="stale">{String(deferred !== obs)}</span>
        <Suspense fallback={<Fallback />}>
          <Reader promise={promise} />
        </Suspense>
      </>
    )
  }

  await renderAsync(<Parent />)
  await act(async () => {
    a.resolve('A')
  })
  await waitFor(() => expect(screen.getByTestId('value').textContent).toBe('A'))

  await act(async () => {
    screen.getByRole('button', {name: 'swap'}).click()
  })

  // The urgent pass committed with the old (deferred) observable; the deferred
  // catch-up render suspended on the new entry and was discarded without
  // committing — the new source was never subscribed.
  expect(b.subscriptions).toBe(0)
  expect(screen.getByTestId('value').textContent).toBe('A')
  // The deferred value never catches up, so the UI reports stale forever.
  expect(screen.getByTestId('stale').textContent).toBe('true')
  expect(screen.queryByTestId('fallback')).toBeNull()

  await act(async () => {
    await wait(150)
  })
  expect(b.subscriptions).toBe(0)
  expect(screen.getByTestId('stale').textContent).toBe('true')
  expect(screen.getByTestId('value').textContent).toBe('A')
})

test('preloading the target in the event handler lets the useDeferredValue swap converge while keeping previous content', async () => {
  const a = trackedObservable()
  const b = trackedObservable()

  function Parent() {
    const [obs, setObs] = useState(a.observable)
    const deferred = useDeferredValue(obs)
    const promise = useObservablePromise(deferred)
    return (
      <>
        <button
          type="button"
          onClick={() => {
            // The deferred re-render suspends on the new entry and therefore
            // never commits — it cannot start the fetch itself. Warming the
            // target in the event handler is what lets the swap resolve.
            void preloadObservablePromise(b.observable)
            setObs(b.observable)
          }}
        >
          swap
        </button>
        <span data-testid="stale">{String(deferred !== obs)}</span>
        <Suspense fallback={<Fallback />}>
          <Reader promise={promise} />
        </Suspense>
      </>
    )
  }

  await renderAsync(<Parent />)
  await act(async () => {
    a.resolve('A')
  })
  await waitFor(() => expect(screen.getByTestId('value').textContent).toBe('A'))

  await act(async () => {
    screen.getByRole('button', {name: 'swap'}).click()
  })
  // Preload started the fetch; the deferred value keeps the previous content
  // visible (and reports stale) while the new data loads.
  expect(b.subscriptions).toBe(1)
  expect(screen.getByTestId('value').textContent).toBe('A')
  expect(screen.getByTestId('stale').textContent).toBe('true')

  await act(async () => {
    b.resolve('B')
    await wait(0)
  })
  await waitFor(() => expect(screen.getByTestId('value').textContent).toBe('B'))
  expect(screen.getByTestId('stale').textContent).toBe('false')
  // The swap never committed the Suspense fallback.
  expect(screen.queryByTestId('fallback')).toBeNull()
  expect(b.subscriptions).toBe(1)
})

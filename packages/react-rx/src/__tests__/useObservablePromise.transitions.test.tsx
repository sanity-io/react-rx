import {act, render, screen, waitFor} from '@testing-library/react'
import {
  StrictMode,
  Suspense,
  use,
  useDeferredValue,
  useState,
  useTransition,
  type ReactNode,
} from 'react'
import {defer, from, type Observable} from 'rxjs'
import {expect, test} from 'vitest'

import {preloadObservablePromise, useObservablePromise} from '../useObservablePromise'

/**
 * Covers observable swaps under `startTransition` / `useDeferredValue` —
 * React's canonical client-side refetch pattern (swap the data source inside
 * a transition; previous content stays visible while the new data loads).
 *
 * A suspended transition render never commits, so commit-driven fetching
 * alone would deadlock it: the render suspends on a promise nothing has
 * started, and the commit that would start the fetch never happens. The hook
 * therefore starts a swapped-in source during the render of a consumer that
 * is already live (committed, visible, subscribed) — the live-swap eager
 * start. Mounts, `disabled` consumers, and hidden `<Activity>` pre-renders
 * have no live subscription and stay fully lazy.
 *
 * `preloadObservablePromise` remains the way to have the target already in
 * flight (or settled) before the swap — hover/route warming — and shares the
 * entry with the eager start, so the source is still subscribed only once.
 */

async function renderAsync(ui: ReactNode) {
  let result!: ReturnType<typeof render>
  await act(async () => {
    result = render(ui)
  })
  return result
}

function Fallback() {
  return <div data-testid="fallback">loading</div>
}

function Reader({promise}: {promise: Promise<string>}) {
  const value = use(promise)
  return <div data-testid="value">{value}</div>
}

/** Disabled consumer that surfaces the shared promise's status as text. */
function DisabledConsumer({obs}: {obs: Observable<string>}) {
  const promise = useObservablePromise(obs, {disabled: true})
  return <span data-testid="status">{promise.status}</span>
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
  // A sync update must show the fallback. The live consumer's swap render
  // already starts the fetch; the fallback commit's re-subscription shares the
  // same connection, so the source is still subscribed exactly once.
  expect(screen.getByTestId('fallback')).toBeTruthy()
  expect(b.subscriptions).toBe(1)

  await act(async () => {
    b.resolve('B')
  })
  await waitFor(() => expect(screen.getByTestId('value').textContent).toBe('B'))
})

test('startTransition swap works without preload: the live consumer’s transition render starts the fetch and the swap commits when it settles', async () => {
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

  // The transition render suspended on the new entry, but — because this
  // consumer is live — that render itself started the fetch.
  expect(b.subscriptions).toBe(1)
  // Transition semantics: previous content stays up, no committed fallback.
  expect(screen.getByTestId('value').textContent).toBe('A')
  expect(screen.getByTestId('pending').textContent).toBe('true')
  expect(screen.queryByTestId('fallback')).toBeNull()

  // Settling the source resolves the suspended promise; React retries the
  // transition and commits the swap.
  await act(async () => {
    b.resolve('B')
  })
  await waitFor(() => expect(screen.getByTestId('value').textContent).toBe('B'))
  expect(screen.getByTestId('pending').textContent).toBe('false')
  expect(screen.queryByTestId('fallback')).toBeNull()
  // The commit’s store subscription shares the connection the swap render
  // started — no second subscription.
  expect(b.subscriptions).toBe(1)
})

test('superseded transition: swapping again mid-flight starts the newer target and the earlier one settles into the shared cache without committing', async () => {
  const a = trackedObservable()
  const b = trackedObservable()
  const c = trackedObservable()

  function Parent() {
    const [isPending, startTransition] = useTransition()
    const [obs, setObs] = useState(a.observable)
    const promise = useObservablePromise(obs)
    return (
      <>
        <button type="button" onClick={() => startTransition(() => setObs(b.observable))}>
          swap-b
        </button>
        <button type="button" onClick={() => startTransition(() => setObs(c.observable))}>
          swap-c
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
    screen.getByRole('button', {name: 'swap-b'}).click()
  })
  expect(b.subscriptions).toBe(1)

  // Supersede the in-flight swap before it settles.
  await act(async () => {
    screen.getByRole('button', {name: 'swap-c'}).click()
  })
  expect(c.subscriptions).toBe(1)
  expect(screen.getByTestId('value').textContent).toBe('A')

  await act(async () => {
    c.resolve('C')
  })
  await waitFor(() => expect(screen.getByTestId('value').textContent).toBe('C'))
  expect(screen.getByTestId('pending').textContent).toBe('false')

  // The abandoned target settles harmlessly into the cache: no re-render, no
  // extra subscription, UI unaffected.
  await act(async () => {
    b.resolve('B')
  })
  expect(screen.getByTestId('value').textContent).toBe('C')
  expect(b.subscriptions).toBe(1)
})

test('strict mode: the double-invoked swap render starts the source exactly once', async () => {
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

  await renderAsync(
    <StrictMode>
      <Parent />
    </StrictMode>,
  )
  await act(async () => {
    a.resolve('A')
  })
  await waitFor(() => expect(screen.getByTestId('value').textContent).toBe('A'))
  expect(a.subscriptions).toBe(1)

  await act(async () => {
    screen.getByRole('button', {name: 'swap'}).click()
  })
  // Strict mode double-invokes the render body; the second eager start finds
  // the resolver already in flight and no-ops.
  expect(b.subscriptions).toBe(1)

  await act(async () => {
    b.resolve('B')
  })
  await waitFor(() => expect(screen.getByTestId('value').textContent).toBe('B'))
  expect(b.subscriptions).toBe(1)
})

test('disabled consumers never eager-start: swapping the observable fetches nothing', async () => {
  const a = trackedObservable()
  const b = trackedObservable()

  const {rerender} = await renderAsync(<DisabledConsumer obs={a.observable} />)
  expect(a.subscriptions).toBe(0)
  expect(screen.getByTestId('status').textContent).toBe('pending')

  await act(async () => {
    rerender(<DisabledConsumer obs={b.observable} />)
  })
  // No live subscription exists (disabled never subscribes), so the swap
  // render must not start the new source either.
  expect(b.subscriptions).toBe(0)
  expect(screen.getByTestId('status').textContent).toBe('pending')
})

test('preloading in the event handler still works and shares the connection with the swap render (single subscription)', async () => {
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
            // Optional since the swap render starts the fetch itself — but a
            // preload (e.g. on hover) means the target can already be in
            // flight, or settled, by the time the transition renders.
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
  // The preload started the fetch; the swap render's eager start found the
  // resolver in flight and no-oped. One subscription total.
  expect(b.subscriptions).toBe(1)
  expect(screen.getByTestId('value').textContent).toBe('A')
  expect(screen.getByTestId('pending').textContent).toBe('true')

  await act(async () => {
    b.resolve('B')
  })
  await waitFor(() => expect(screen.getByTestId('value').textContent).toBe('B'))
  expect(screen.getByTestId('pending').textContent).toBe('false')
  expect(screen.queryByTestId('fallback')).toBeNull()
  expect(b.subscriptions).toBe(1)
})

test('useDeferredValue swap converges without preload: the deferred render starts the fetch and catches up when it settles', async () => {
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

  // The urgent pass committed with the old (deferred) observable and stayed
  // live; the deferred catch-up render suspended on the new entry after
  // starting its fetch.
  expect(b.subscriptions).toBe(1)
  expect(screen.getByTestId('value').textContent).toBe('A')
  expect(screen.getByTestId('stale').textContent).toBe('true')
  expect(screen.queryByTestId('fallback')).toBeNull()

  await act(async () => {
    b.resolve('B')
  })
  await waitFor(() => expect(screen.getByTestId('value').textContent).toBe('B'))
  expect(screen.getByTestId('stale').textContent).toBe('false')
  expect(screen.queryByTestId('fallback')).toBeNull()
  expect(b.subscriptions).toBe(1)
})

test('preloading before a useDeferredValue swap still works and shares the connection (single subscription)', async () => {
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
  expect(b.subscriptions).toBe(1)
  expect(screen.getByTestId('value').textContent).toBe('A')
  expect(screen.getByTestId('stale').textContent).toBe('true')

  await act(async () => {
    b.resolve('B')
  })
  await waitFor(() => expect(screen.getByTestId('value').textContent).toBe('B'))
  expect(screen.getByTestId('stale').textContent).toBe('false')
  expect(screen.queryByTestId('fallback')).toBeNull()
  expect(b.subscriptions).toBe(1)
})

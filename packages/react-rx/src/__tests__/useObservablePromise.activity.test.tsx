import {act, render, screen, waitFor} from '@testing-library/react'
import {Activity, Suspense, use, useState, type ReactNode} from 'react'
import {defer, from, Observable, Subject} from 'rxjs'
import {expect, test} from 'vitest'

import {useObservablePromise} from '../useObservablePromise'

/**
 * Documents how `useObservablePromise` interacts with React 19.2's `<Activity>`.
 *
 * Hidden trees are never "live" (no committed store subscription — hiding
 * tears it down), so hidden pre-renders trigger no fetching: neither on mount
 * nor via the live-swap eager start. The two supported shapes are:
 *
 * - Call the hook in a visible component and pass the promise into the hidden
 *   tree, where `use(promise)` lets React pre-render and suspend/resume on its
 *   own schedule — the visible owner's commit is what starts the fetch.
 * - Call the hook inside the hidden tree: it stays fully paused (no
 *   subscription) until the tree is revealed and effects mount.
 *
 * In both shapes the `<Suspense>` boundary sits between the hook caller and
 * the `use()` reader — the hook caller must be able to commit while the reader
 * suspends. `preloadObservablePromise` is the explicit warm-up for anything
 * else.
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

/** Hook caller with a swappable source; the boundary sits below the hook. */
function SwappableOwner({obs}: {obs: Observable<string>}) {
  const p = useObservablePromise(obs)
  return (
    <Suspense fallback={<Fallback />}>
      <Reader promise={p} />
    </Suspense>
  )
}

function ToggleActivity({
  children,
  initialMode = 'visible',
}: {
  children: ReactNode
  initialMode?: 'visible' | 'hidden'
}) {
  const [mode, setMode] = useState<'visible' | 'hidden'>(initialMode)
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

test('parent-owned promise: hidden Activity pre-renders with the fetch the visible parent started', async () => {
  let subscriptions = 0
  let resolve!: (value: string) => void
  const promise = new Promise<string>((r) => {
    resolve = r
  })
  const observable = defer(() => {
    subscriptions++
    return from(promise)
  })
  let fallbackCount = 0

  // The intended composition: the hook lives in a component that stays
  // visible and commits (starting the fetch); the promise is handed to a
  // component inside the <Activity> boundary, which reads it with use() so
  // React can pre-render in the background and suspend only if the observable
  // has not emitted yet.
  function App({mode}: {mode: 'visible' | 'hidden'}) {
    const p = useObservablePromise(observable)
    return (
      <Activity mode={mode}>
        {/* oxlint-disable-next-line react/todo -- compiler cannot yet lower ++ captured in lambdas */}
        <Suspense fallback={<Fallback onRender={() => fallbackCount++} />}>
          <Reader promise={p} />
        </Suspense>
      </Activity>
    )
  }

  const {rerender} = await renderAsync(<App mode="hidden" />)

  // The visible parent committed, so the fetch is in flight even though the
  // Activity content is hidden.
  expect(subscriptions).toBe(1)

  await act(async () => {
    resolve('prefetched')
    await promise
  })

  // Still hidden — the pre-render completed with the data (display:none DOM).
  await waitFor(() => {
    expect(screen.queryByTestId('value')?.textContent).toBe('prefetched')
  })
  const fallbacksWhileHidden = fallbackCount

  await act(async () => {
    rerender(<App mode="visible" />)
  })

  // Reveal shows the pre-rendered content without re-activating Suspense.
  expect(screen.getByTestId('value').textContent).toBe('prefetched')
  expect(fallbackCount).toBe(fallbacksWhileHidden)
  expect(subscriptions).toBe(1)
})

test('hook inside a hidden Activity stays paused; reveal mounts effects and starts the fetch', async () => {
  let subscriptions = 0
  let resolve!: (value: string) => void
  const promise = new Promise<string>((r) => {
    resolve = r
  })
  const observable = defer(() => {
    subscriptions++
    return from(promise)
  })

  // The hook caller does not suspend itself: it commits on reveal, which is
  // what starts the fetch. The Suspense boundary lives between the hook and
  // the use() consumer.
  function Owner() {
    const p = useObservablePromise(observable)
    return (
      <Suspense fallback={<Fallback />}>
        <Reader promise={p} />
      </Suspense>
    )
  }

  await renderAsync(
    <ToggleActivity initialMode="hidden">
      <Owner />
    </ToggleActivity>,
  )

  // Hidden: pre-rendered but paused — no subscription, no fetching.
  expect(subscriptions).toBe(0)

  // Reveal: effects mount, the store subscription starts the source.
  await toggle()
  expect(subscriptions).toBe(1)
  expect(screen.getByTestId('fallback')).toBeTruthy()

  await act(async () => {
    resolve('revealed')
    await promise
  })
  await waitFor(() => expect(screen.getByTestId('value').textContent).toBe('revealed'))
  expect(subscriptions).toBe(1)
})

test('visible Activity hide/show preserves fulfilled value across toggles', async () => {
  let resolve!: (value: string) => void
  const promise = new Promise<string>((r) => {
    resolve = r
  })
  const observable = defer(() => from(promise))

  function Owner() {
    const p = useObservablePromise(observable, {ttl: 500})
    return (
      <Suspense fallback={<Fallback />}>
        <Reader promise={p} />
      </Suspense>
    )
  }

  await renderAsync(
    <ToggleActivity>
      <Owner />
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

test('entry evicted while hidden: reveal shows the cached value without fallback or refetch', async () => {
  let subscriptions = 0
  let resolve!: (value: string) => void
  const promise = new Promise<string>((r) => {
    resolve = r
  })
  const observable = defer(() => {
    subscriptions++
    return from(promise)
  })
  let fallbackCount = 0

  function Owner() {
    const p = useObservablePromise(observable, {ttl: 40})
    return (
      // oxlint-disable-next-line react/todo -- compiler cannot yet lower ++ captured in lambdas
      <Suspense fallback={<Fallback onRender={() => fallbackCount++} />}>
        <Reader promise={p} />
      </Suspense>
    )
  }

  await renderAsync(
    <ToggleActivity>
      <Owner />
    </ToggleActivity>,
  )
  await act(async () => {
    resolve('fetched')
    await promise
  })
  await waitFor(() => expect(screen.getByTestId('value').textContent).toBe('fetched'))
  const fallbacksBeforeHide = fallbackCount
  expect(subscriptions).toBe(1)

  // Hide: the store subscription is torn down, so after `ttl` the shared cache
  // entry is evicted. The component is still mounted and must keep its pinned
  // entry — otherwise reveal would find a fresh pending entry and re-suspend.
  await toggle()
  await act(async () => {
    await new Promise((r) => setTimeout(r, 100))
  })

  await toggle()
  expect(screen.getByTestId('value').textContent).toBe('fetched')
  expect(fallbackCount).toBe(fallbacksBeforeHide)
  // The source completed after its single emission — reveal must not refetch.
  expect(subscriptions).toBe(1)
})

test('swapping the observable while hidden stays paused: hiding tears down the live subscription, so the swap render must not eager-start', async () => {
  const a = trackedObservable()
  const b = trackedObservable()

  // Visible first: the consumer commits, subscribes, and becomes "live" — the
  // state that qualifies for the live-swap eager start.
  const {rerender} = await renderAsync(
    <Activity mode="visible">
      <SwappableOwner obs={a.observable} />
    </Activity>,
  )
  expect(a.subscriptions).toBe(1)
  await act(async () => {
    a.resolve('A')
  })
  await waitFor(() => expect(screen.getByTestId('value').textContent).toBe('A'))

  // Hide: effects unmount, the store subscription is torn down — the consumer
  // is no longer live.
  await act(async () => {
    rerender(
      <Activity mode="hidden">
        <SwappableOwner obs={a.observable} />
      </Activity>,
    )
  })

  // Swap the observable while hidden. The hidden pre-render runs the hook with
  // the new identity, but with no live subscription it must stay fully paused.
  await act(async () => {
    rerender(
      <Activity mode="hidden">
        <SwappableOwner obs={b.observable} />
      </Activity>,
    )
  })
  expect(b.subscriptions).toBe(0)

  // Reveal: effects mount, the commit-time store subscription starts the fetch.
  await act(async () => {
    rerender(
      <Activity mode="visible">
        <SwappableOwner obs={b.observable} />
      </Activity>,
    )
  })
  expect(b.subscriptions).toBe(1)
  await act(async () => {
    b.resolve('B')
  })
  await waitFor(() => expect(screen.getByTestId('value').textContent).toBe('B'))
})

test('hiding and swapping in the same update stays paused: the swap must not fetch for a tree that is being hidden', async () => {
  const a = trackedObservable()
  const b = trackedObservable()

  const {rerender} = await renderAsync(
    <Activity mode="visible">
      <SwappableOwner obs={a.observable} />
    </Activity>,
  )
  expect(a.subscriptions).toBe(1)
  await act(async () => {
    a.resolve('A')
  })
  await waitFor(() => expect(screen.getByTestId('value').textContent).toBe('A'))

  // One update changes BOTH the Activity mode and the observable. Whatever
  // order React renders and commits internally, the net effect must not start
  // a fetch on behalf of newly hidden content.
  await act(async () => {
    rerender(
      <Activity mode="hidden">
        <SwappableOwner obs={b.observable} />
      </Activity>,
    )
  })
  expect(b.subscriptions).toBe(0)

  // Reveal starts it via the commit-time store subscription, as usual.
  await act(async () => {
    rerender(
      <Activity mode="visible">
        <SwappableOwner obs={b.observable} />
      </Activity>,
    )
  })
  expect(b.subscriptions).toBe(1)
  await act(async () => {
    b.resolve('B')
  })
  await waitFor(() => expect(screen.getByTestId('value').textContent).toBe('B'))
})

test('long-lived source: share retention keeps the connection during ttl, so hidden emissions update the cache', async () => {
  const subject = new Subject<string>()
  let subscriptions = 0
  const observable = new Observable<string>((subscriber) => {
    subscriptions++
    const sub = subject.subscribe(subscriber)
    return () => sub.unsubscribe()
  })

  function Owner() {
    const p = useObservablePromise(observable, {ttl: 200})
    return (
      <Suspense fallback={<Fallback />}>
        <Reader promise={p} />
      </Suspense>
    )
  }

  await renderAsync(
    <ToggleActivity>
      <Owner />
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

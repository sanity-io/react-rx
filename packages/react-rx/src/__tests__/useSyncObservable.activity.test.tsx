import {act, render, screen} from '@testing-library/react'
import {Activity, useState, type ReactNode} from 'react'
import {defer, from, Observable, of, Subject} from 'rxjs'
import {expect, test} from 'vitest'

import {useSyncObservable} from '../useSyncObservable'

/**
 * `<Activity>` parity suite for `useSyncObservable` — the synchronous counterpart of
 * `useObservable.activity.test.tsx`. Sanity reads edit state, validation, and other
 * write-gating values through the sync hook inside panes that get hidden, so the same
 * hide/show guarantees must hold without the deferral layer:
 *
 * - `<Activity mode="hidden">` tears down the `useSyncExternalStore` subscription and
 *   re-creates it on reveal, while React state / the last rendered UI are preserved.
 * - Without an `initialValue`, the render-phase warm-up probe still seeds synchronous
 *   emissions into the WeakMap cache even when Activity has not mounted a live
 *   subscription yet. With an `initialValue` there is no probe — a hidden mount performs
 *   no subscription at all until it becomes visible.
 * - The cache entry keeps `didEmit` / `snapshot` across hidden re-renders, so revealed
 *   panes resume from the last emission instead of the `initialValue`.
 */

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
  // `share({resetOnRefCountZero: () => timer(0, asapScheduler)})` delays teardown
  await Promise.resolve()
}

function textOf(testId: string) {
  return screen.getByTestId(testId).textContent
}

test('Activity hides and restores useSyncObservable subscriptions the same way it does Effects', async () => {
  const events: string[] = []
  const observable = new Observable<string>((subscriber) => {
    events.push('subscribe')
    subscriber.next('value')
    return () => {
      events.push('unsubscribe')
    }
  })

  function Child() {
    return <div data-testid="value">{useSyncObservable(observable, undefined)}</div>
  }

  render(
    <ToggleActivity>
      <Child />
    </ToggleActivity>,
  )

  expect(events).toEqual(['subscribe'])
  expect(textOf('value')).toBe('value')

  await toggle()
  expect(events).toEqual(['subscribe', 'unsubscribe'])
  // Last rendered value is preserved while hidden (display:none).
  expect(textOf('value')).toBe('value')
  expect(screen.getByTestId('value').style.display).toBe('none')

  await toggle()
  expect(events).toEqual(['subscribe', 'unsubscribe', 'subscribe'])
  expect(textOf('value')).toBe('value')
  expect(screen.getByTestId('value').style.display).not.toBe('none')
})

test('sync observable with initial value: sync emission wins over initial, including across Activity toggles', async () => {
  const observable = of('sync')

  function Child() {
    return <div data-testid="value">{useSyncObservable(observable, 'initial')}</div>
  }

  render(
    <ToggleActivity>
      <Child />
    </ToggleActivity>,
  )

  expect(textOf('value')).toBe('sync')

  await toggle()
  expect(textOf('value')).toBe('sync')

  await toggle()
  expect(textOf('value')).toBe('sync')
})

test('async observable with initial value: emissions while Activity is hidden are dropped until visible again', async () => {
  const subject = new Subject<string>()
  let subscriptions = 0
  const observable = new Observable<string>((subscriber) => {
    subscriptions++
    const subscription = subject.subscribe(subscriber)
    return () => subscription.unsubscribe()
  })

  function Child() {
    return <div data-testid="value">{useSyncObservable(observable, 'initial')}</div>
  }

  render(
    <ToggleActivity>
      <Child />
    </ToggleActivity>,
  )

  expect(textOf('value')).toBe('initial')
  act(() => subject.next('visible-1'))
  expect(textOf('value')).toBe('visible-1')
  expect(subscriptions).toBe(1)

  await toggle()
  expect(subscriptions).toBe(1)
  expect(textOf('value')).toBe('visible-1')

  // No live subscription while hidden — this emission is dropped.
  act(() => subject.next('hidden-missed'))
  expect(textOf('value')).toBe('visible-1')

  await toggle()
  expect(subscriptions).toBe(2)
  // Last value from before hide is still shown; the missed emission never arrived.
  expect(textOf('value')).toBe('visible-1')

  act(() => subject.next('visible-2'))
  expect(textOf('value')).toBe('visible-2')
})

test('async fetch that resolves while Activity is hidden: value appears when becoming visible again', async () => {
  let resolve!: (value: string) => void
  const promise = new Promise<string>((r) => {
    resolve = r
  })
  const observable = defer(() => from(promise))

  function Child() {
    return <div data-testid="value">{useSyncObservable(observable, 'initial')}</div>
  }

  render(
    <ToggleActivity>
      <Child />
    </ToggleActivity>,
  )

  expect(textOf('value')).toBe('initial')

  await toggle()
  // Resolve while unsubscribed / hidden.
  await act(async () => {
    resolve('fetched-while-hidden')
    await promise
  })
  // Still showing the pre-hide snapshot — no subscription to receive the emission.
  expect(textOf('value')).toBe('initial')

  await toggle()
  // Re-subscribe hits `from(alreadyResolvedPromise)`, which emits synchronously.
  expect(textOf('value')).toBe('fetched-while-hidden')
})

test('Activity initially hidden with an initial value: no subscription at all until visible (warm-up skipped)', async () => {
  let activeSubscriptions = 0
  let totalSubscriptions = 0
  const observable = new Observable<string>((subscriber) => {
    activeSubscriptions++
    totalSubscriptions++
    subscriber.next('sync')
    return () => {
      activeSubscriptions--
    }
  })

  function Child() {
    return <div data-testid="value">{useSyncObservable(observable, 'initial')}</div>
  }

  const {rerender} = render(
    <Activity mode="hidden">
      <Child />
    </Activity>,
  )

  // With an initialValue there is no render-phase probe, and a hidden Activity mounts no
  // effects — the source has never been subscribed at all.
  await act(async () => {
    await Promise.resolve()
  })
  expect(totalSubscriptions).toBe(0)
  expect(activeSubscriptions).toBe(0)
  // The hidden DOM shows the initialValue; nothing has emitted yet.
  expect(textOf('value')).toBe('initial')
  expect(screen.getByTestId('value').style.display).toBe('none')

  rerender(
    <Activity mode="visible">
      <Child />
    </Activity>,
  )
  await act(async () => {
    await Promise.resolve()
  })

  // Becoming visible starts the live subscription; the sync emission replaces the initial.
  expect(totalSubscriptions).toBeGreaterThan(0)
  expect(activeSubscriptions).toBeGreaterThan(0)
  expect(textOf('value')).toBe('sync')
})

/** Kept at module scope so identity is stable across App re-renders. */
function HiddenRerenderProbe({
  label,
  observable,
  log,
}: {
  label: string
  observable: Observable<string>
  log: string[]
}) {
  const value = useSyncObservable(observable, 'initial')
  log.push(value)
  return (
    <div data-testid="value">
      {label}:{value}
    </div>
  )
}

function HiddenRerenderApp({observable, log}: {observable: Observable<string>; log: string[]}) {
  const [mode, setMode] = useState<'visible' | 'hidden'>('visible')
  const [label, setLabel] = useState('a')
  return (
    <>
      <button
        type="button"
        onClick={() => setMode((m) => (m === 'visible' ? 'hidden' : 'visible'))}
      >
        toggle
      </button>
      <button type="button" onClick={() => setLabel('b')}>
        relabel
      </button>
      <Activity mode={mode}>
        <HiddenRerenderProbe label={label} observable={observable} log={log} />
      </Activity>
    </>
  )
}

test('hidden re-renders and the reveal keep the cached emission, never the initialValue', async () => {
  // The WeakMap cache entry keeps `didEmit` / `snapshot` while the subscription is torn
  // down, so a hidden re-render (forced by a parent update) reads the last emission
  // from `getSnapshot` — not the `initialValue`.
  const subject = new Subject<string>()
  const log: string[] = []

  render(<HiddenRerenderApp observable={subject} log={log} />)
  act(() => subject.next('emitted'))
  expect(textOf('value')).toBe('a:emitted')

  // Hide: the store subscription tears down but the WeakMap cache entry survives.
  await act(async () => {
    screen.getByRole('button', {name: 'toggle'}).click()
  })
  await Promise.resolve()
  expect(screen.getByTestId('value').style.display).toBe('none')

  log.length = 0
  // Parent update re-renders the hidden tree (lower priority — give React a turn to flush).
  await act(async () => {
    screen.getByRole('button', {name: 'relabel'}).click()
  })
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
  expect(log.length).toBeGreaterThan(0)
  expect(log).not.toContain('initial')
  expect(textOf('value')).toBe('b:emitted')

  // Reveal: the preserved tree still shows the cached snapshot.
  await act(async () => {
    screen.getByRole('button', {name: 'toggle'}).click()
  })
  await Promise.resolve()
  expect(textOf('value')).toBe('b:emitted')
  expect(screen.getByTestId('value').style.display).not.toBe('none')
  expect(log).not.toContain('initial')
  expect(log.every((v) => v === 'emitted')).toBe(true)
})

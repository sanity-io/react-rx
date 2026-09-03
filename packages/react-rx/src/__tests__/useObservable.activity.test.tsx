import {act, render, screen} from '@testing-library/react'
import {Activity, useState, type ReactNode} from 'react'
import {defer, from, Observable, of, Subject} from 'rxjs'
import {expect, test} from 'vitest'

import {useObservable} from '../useObservable'

/**
 * Documents how `useObservable` interacts with React 19.2's `<Activity>`.
 *
 * `<Activity mode="hidden">` destroys Effects and also tears down
 * `useSyncExternalStore` subscriptions (the hook `useObservable` is built on).
 * When the boundary becomes visible again, subscriptions are re-created while
 * React state / the last rendered UI are preserved.
 *
 * When no `initialValue` is given, `useObservable` also eagerly probes the
 * observable during render to pick up synchronous emissions, so sync sources
 * can still populate the snapshot even when Activity has not yet mounted a
 * live subscription. With an `initialValue` there is no render-phase probe —
 * a hidden mount performs no subscription at all until it becomes visible.
 *
 * While hidden, children can still re-render from new props (lower priority).
 * The WeakMap cache entry for a stable observable keeps `didEmit` / `snapshot`,
 * so a later async emission is not lost when the Activity becomes visible again
 * — even if a parent `useState` update forced a hidden re-render in between.
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

/** Used by the parent-state-while-hidden scenario below — kept at module scope so identity is stable across App re-renders. */
function LabeledObservableValue({
  label,
  observable,
}: {
  label: string
  observable: Observable<string>
}) {
  const value = useObservable(observable, 'initial')
  return (
    <div data-testid="child">
      <span data-testid="label">{label}</span>
      <span data-testid="value">{value}</span>
    </div>
  )
}

function ParentStateWhileHiddenApp({observable}: {observable: Observable<string>}) {
  const [mode, setMode] = useState<'visible' | 'hidden'>('visible')
  const [label, setLabel] = useState('before')
  return (
    <>
      <button
        type="button"
        onClick={() => setMode((m) => (m === 'visible' ? 'hidden' : 'visible'))}
      >
        toggle
      </button>
      <button type="button" onClick={() => setLabel('after')}>
        update-parent
      </button>
      <Activity mode={mode}>
        <LabeledObservableValue label={label} observable={observable} />
      </Activity>
    </>
  )
}

test('Activity hides and restores useObservable subscriptions the same way it does Effects', async () => {
  const events: string[] = []
  const observable = new Observable<string>((subscriber) => {
    events.push('subscribe')
    subscriber.next('value')
    return () => {
      events.push('unsubscribe')
    }
  })

  function Child() {
    return <div data-testid="value">{useObservable(observable, undefined)}</div>
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

test('sync observable (of/from) with an undefined initial value: hide keeps last value, show re-subscribes sync', async () => {
  let subscriptions = 0
  // Equivalent to `of('sync')` / `from(['sync'])` for the first emission: sync on subscribe.
  const observable = new Observable<string>((subscriber) => {
    subscriptions++
    subscriber.next('sync')
  })

  function Child() {
    return <div data-testid="value">{String(useObservable(observable, undefined))}</div>
  }

  render(
    <ToggleActivity>
      <Child />
    </ToggleActivity>,
  )

  // Live subscription is active (eager probe + uSES share the same underlying subscription
  // while refcount stays > 0 across the delayed reset window).
  expect(subscriptions).toBe(1)
  expect(textOf('value')).toBe('sync')

  await toggle()
  expect(subscriptions).toBe(1)
  expect(textOf('value')).toBe('sync')

  await toggle()
  // Becoming visible creates a fresh subscription; sync emission is available immediately.
  expect(subscriptions).toBe(2)
  expect(textOf('value')).toBe('sync')
})

test('sync observable with initial value: sync emission replaces the initial right after mount, and sticks across Activity toggles', async () => {
  const observable = of('sync')

  function Child() {
    return <div data-testid="value">{useObservable(observable, 'initial')}</div>
  }

  render(
    <ToggleActivity>
      <Child />
    </ToggleActivity>,
  )

  // With an initialValue there is no render-phase probe: the first render paints 'initial',
  // and the store subscription on commit delivers the sync emission before this assertion.
  expect(textOf('value')).toBe('sync')

  await toggle()
  expect(textOf('value')).toBe('sync')

  await toggle()
  expect(textOf('value')).toBe('sync')
})

test('async observable with initial value: shows initial until emission, keeps it across hide/show', async () => {
  let resolve!: (value: string) => void
  const promise = new Promise<string>((r) => {
    resolve = r
  })
  // `defer(() => from(promise))` is the Rx equivalent of a late-resolving fetch.
  const observable = defer(() => from(promise))

  function Child() {
    return <div data-testid="value">{useObservable(observable, 'initial')}</div>
  }

  render(
    <ToggleActivity>
      <Child />
    </ToggleActivity>,
  )

  expect(textOf('value')).toBe('initial')

  await act(async () => {
    resolve('fetched')
    await promise
  })
  expect(textOf('value')).toBe('fetched')

  await toggle()
  expect(textOf('value')).toBe('fetched')

  await toggle()
  // Cache + re-subscribe to an already-resolved promise keeps the fetched value.
  expect(textOf('value')).toBe('fetched')
})

test('async observable with an undefined initial value: undefined until emission, then preserved across Activity toggles', async () => {
  let resolve!: (value: string) => void
  const promise = new Promise<string>((r) => {
    resolve = r
  })
  const observable = defer(() => from(promise))

  function Child() {
    return <div data-testid="value">{String(useObservable(observable, undefined))}</div>
  }

  render(
    <ToggleActivity>
      <Child />
    </ToggleActivity>,
  )

  expect(textOf('value')).toBe('undefined')

  await act(async () => {
    resolve('fetched')
    await promise
  })
  expect(textOf('value')).toBe('fetched')

  await toggle()
  expect(textOf('value')).toBe('fetched')

  await toggle()
  expect(textOf('value')).toBe('fetched')
})

test('async observable with initial value: emissions while Activity is hidden are ignored until visible again', async () => {
  const subject = new Subject<string>()
  let subscriptions = 0
  const observable = new Observable<string>((subscriber) => {
    subscriptions++
    const subscription = subject.subscribe(subscriber)
    return () => subscription.unsubscribe()
  })

  function Child() {
    return <div data-testid="value">{useObservable(observable, 'initial')}</div>
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
    return <div data-testid="value">{useObservable(observable, 'initial')}</div>
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
    return <div data-testid="value">{useObservable(observable, 'initial')}</div>
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

test('Activity initially hidden with async observable and initial value: never subscribes while hidden, stays at initial until visible and resolved', async () => {
  let resolve!: (value: string) => void
  const promise = new Promise<string>((r) => {
    resolve = r
  })
  let subscriptionCount = 0
  const observable = defer(() => {
    subscriptionCount++
    return from(promise)
  })

  function Child() {
    return <div data-testid="value">{useObservable(observable, 'initial')}</div>
  }

  const {rerender} = render(
    <Activity mode="hidden">
      <Child />
    </Activity>,
  )

  await act(async () => {
    await Promise.resolve()
  })
  // With an initialValue there is no render-phase probe: a hidden mount performs no
  // subscription — and starts no fetch — at all.
  expect(subscriptionCount).toBe(0)
  expect(textOf('value')).toBe('initial')

  await act(async () => {
    resolve('fetched')
    await promise
  })
  // Still initial — nothing is subscribed while hidden.
  expect(subscriptionCount).toBe(0)
  expect(textOf('value')).toBe('initial')

  rerender(
    <Activity mode="visible">
      <Child />
    </Activity>,
  )
  await act(async () => {
    await Promise.resolve()
  })

  // Becoming visible subscribes; `from(resolvedPromise)` emits synchronously.
  expect(subscriptionCount).toBeGreaterThan(0)
  expect(textOf('value')).toBe('fetched')
})

test('sync from() without initial value under initially-hidden Activity still renders the sync value', async () => {
  const observable = from(['from-value'])

  function Child() {
    return <div data-testid="value">{String(useObservable(observable, undefined))}</div>
  }

  render(
    <Activity mode="hidden">
      <Child />
    </Activity>,
  )

  await act(async () => {
    await Promise.resolve()
  })

  expect(textOf('value')).toBe('from-value')
  expect(screen.getByTestId('value').style.display).toBe('none')
})

test('after async emission, hiding Activity then updating parent state: last emission survives when visible again (cache does not reset to initial)', async () => {
  const subject = new Subject<string>()
  let activeSubscriptions = 0
  const observable = new Observable<string>((subscriber) => {
    activeSubscriptions++
    const subscription = subject.subscribe(subscriber)
    return () => {
      activeSubscriptions--
      subscription.unsubscribe()
    }
  })

  render(<ParentStateWhileHiddenApp observable={observable} />)

  // Visible Activity, async source still pending → initial value.
  expect(textOf('value')).toBe('initial')
  expect(textOf('label')).toBe('before')
  expect(activeSubscriptions).toBe(1)

  // Async emission arrives while visible.
  act(() => subject.next('async-emitted'))
  expect(textOf('value')).toBe('async-emitted')

  // Hide: subscription tears down; last rendered emission stays in the hidden DOM.
  await act(async () => {
    screen.getByRole('button', {name: 'toggle'}).click()
  })
  await Promise.resolve()
  expect(activeSubscriptions).toBe(0)
  expect(textOf('value')).toBe('async-emitted')
  expect(screen.getByTestId('child').style.display).toBe('none')

  // Parent useState update while hidden — Activity still re-renders children
  // (lower priority), so the hidden markup eventually reflects the new props.
  await act(async () => {
    screen.getByRole('button', {name: 'update-parent'}).click()
  })
  await act(async () => {
    // Give React a turn to process the deferred hidden update.
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
  expect(textOf('label')).toBe('after')
  expect(screen.getByTestId('child').style.display).toBe('none')
  // Re-render while unsubscribed did not drop the cached emission back to initial.
  expect(textOf('value')).toBe('async-emitted')
  expect(activeSubscriptions).toBe(0)

  // Visible again: live subscription resumes, and the last async emission is still there
  // — the useObservable cache entry did not "die" during the hidden parent update.
  await act(async () => {
    screen.getByRole('button', {name: 'toggle'}).click()
  })
  await Promise.resolve()
  expect(activeSubscriptions).toBe(1)
  expect(textOf('label')).toBe('after')
  expect(textOf('value')).toBe('async-emitted')
  expect(screen.getByTestId('child').style.display).not.toBe('none')
})

/** Used by the no-flash scenario below — kept at module scope so identity is stable across re-renders. */
function NoFlashProbe({
  label,
  observable,
  log,
}: {
  label: string
  observable: Observable<string>
  log: string[]
}) {
  const value = useObservable(observable, 'initial')
  log.push(value)
  return (
    <div data-testid="value">
      {label}:{value}
    </div>
  )
}

function NoFlashApp({observable, log}: {observable: Observable<string>; log: string[]}) {
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
        <NoFlashProbe label={label} observable={observable} log={log} />
      </Activity>
    </>
  )
}

test('hidden re-renders and the reveal never render the initialValue (no flash)', async () => {
  // Renders inside a hidden Activity take useDeferredValue's *mount* path, which returns the
  // second argument. Because that argument is the live snapshot (not the initialValue), a
  // hidden re-render — and therefore the later reveal — never shows the initialValue.
  // (A clean reveal with no intervening update restores the preserved tree without
  // re-rendering at all, so this test forces a parent update while hidden.)
  const subject = new Subject<string>()
  const log: string[] = []

  render(<NoFlashApp observable={subject} log={log} />)
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

import {act, render, screen, waitFor} from '@testing-library/react'
import {Component, Suspense, use, useDeferredValue, useMemo, useState, type ReactNode} from 'react'
import {
  BehaviorSubject,
  defer,
  EMPTY,
  EmptyError,
  from,
  NEVER,
  Observable,
  of,
  startWith,
  Subject,
  throwError,
} from 'rxjs'
import {expect, test, vi} from 'vitest'

// The TTL constants are imported through the package entry point on purpose: the test
// asserts they remain part of the public API surface.
import {DEFAULT_HOOK_TTL, DEFAULT_PRELOAD_TTL} from '../index'
import {
  preloadObservablePromise,
  useObservablePromise,
  type ObservablePromise,
} from '../useObservablePromise'

/**
 * Suspense recovery requires the initial render to be inside an awaited `act`.
 * Otherwise React never attaches the wakeable ping and the boundary stays stuck.
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

function ReaderA({promise}: {promise: Promise<string>}) {
  return <div data-testid="a">{use(promise)}</div>
}

function ReaderB({promise}: {promise: Promise<string>}) {
  return <div data-testid="b">{use(promise)}</div>
}

function EmptyParent({onError}: {onError?: (error: Error) => void}) {
  const p = useObservablePromise(EMPTY)
  return (
    <TestErrorBoundary onError={onError}>
      <Suspense fallback={<Fallback />}>
        <Reader promise={p as Promise<string>} />
      </Suspense>
    </TestErrorBoundary>
  )
}

class TestErrorBoundary extends Component<
  {children: ReactNode; onError?: (error: Error) => void},
  {error: Error | null}
> {
  override state: {error: Error | null} = {error: null}
  static getDerivedStateFromError(error: Error) {
    return {error}
  }
  override componentDidCatch(error: Error) {
    this.props.onError?.(error)
  }
  override render() {
    if (this.state.error) {
      return <div data-testid="error">{this.state.error.message}</div>
    }
    return this.props.children
  }
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

test('suspends until the first emission, then shows data (fallback exactly once)', async () => {
  let resolve!: (value: string) => void
  const promise = new Promise<string>((r) => {
    resolve = r
  })
  const observable = defer(() => from(promise))
  let fallbackCount = 0

  function Parent() {
    const p = useObservablePromise(observable)
    return (
      // oxlint-disable-next-line react/todo -- compiler cannot yet lower ++ captured in lambdas
      <Suspense fallback={<Fallback onRender={() => fallbackCount++} />}>
        <Reader promise={p} />
      </Suspense>
    )
  }

  await renderAsync(<Parent />)
  expect(screen.getByTestId('fallback')).toBeTruthy()
  expect(fallbackCount).toBeGreaterThanOrEqual(1)
  const fallbacksAfterSuspend = fallbackCount

  await act(async () => {
    resolve('hello')
    await promise
  })

  await waitFor(() => expect(screen.getByTestId('value').textContent).toBe('hello'))
  expect(fallbackCount).toBe(fallbacksAfterSuspend)
})

test('sync sources never show a Suspense fallback', async () => {
  const observable = of('sync')
  let fallbackCount = 0

  function Parent() {
    const p = useObservablePromise(observable)
    return (
      // oxlint-disable-next-line react/todo -- compiler cannot yet lower ++ captured in lambdas
      <Suspense fallback={<Fallback onRender={() => fallbackCount++} />}>
        <Reader promise={p} />
      </Suspense>
    )
  }

  await renderAsync(<Parent />)
  expect(screen.getByTestId('value').textContent).toBe('sync')
  expect(fallbackCount).toBe(0)
})

test('startWith(placeholder) fulfills instantly with the placeholder (use useObservable for loading placeholders)', async () => {
  // Use NEVER so only the startWith emission occurs (of()+startWith would sync-emit both).
  const observable = NEVER.pipe(startWith('placeholder'))
  let fallbackCount = 0

  function Parent() {
    const p = useObservablePromise(observable)
    return (
      // oxlint-disable-next-line react/todo -- compiler cannot yet lower ++ captured in lambdas
      <Suspense fallback={<Fallback onRender={() => fallbackCount++} />}>
        <Reader promise={p} />
      </Suspense>
    )
  }

  await renderAsync(<Parent />)
  // firstValueFrom semantics: startWith is the first emission.
  expect(screen.getByTestId('value').textContent).toBe('placeholder')
  expect(fallbackCount).toBe(0)
})

test('promise identity is stable across re-renders while pending', async () => {
  const subject = new Subject<string>()
  const identities: ObservablePromise<string>[] = []

  function Parent() {
    const [, setTick] = useState(0)
    const p = useObservablePromise(subject)
    identities.push(p)
    return (
      <>
        <button type="button" onClick={() => setTick((t) => t + 1)}>
          rerender
        </button>
        <Suspense fallback={<Fallback />}>
          <Reader promise={p} />
        </Suspense>
      </>
    )
  }

  await renderAsync(<Parent />)
  expect(identities[0]?.status).toBe('pending')

  await act(async () => {
    screen.getByRole('button', {name: 'rerender'}).click()
  })

  expect(identities.length).toBeGreaterThanOrEqual(2)
  expect(identities[1]).toBe(identities[0])
})

test('first emission keeps promise identity; later emissions swap without re-activating fallback', async () => {
  const subject = new Subject<string>()
  let fallbackCount = 0
  const identities: ObservablePromise<string>[] = []

  function Parent() {
    const p = useObservablePromise(subject)
    identities.push(p)
    return (
      // oxlint-disable-next-line react/todo -- compiler cannot yet lower ++ captured in lambdas
      <Suspense fallback={<Fallback onRender={() => fallbackCount++} />}>
        <Reader promise={p} />
      </Suspense>
    )
  }

  await renderAsync(<Parent />)
  const pending = identities[0]!
  const fallbacksAfterSuspend = fallbackCount
  const parentRendersBeforeFirstEmission = identities.length

  await act(async () => {
    subject.next('one')
  })
  await waitFor(() => expect(screen.getByTestId('value').textContent).toBe('one'))
  // The first emission unblocks Suspense purely by resolving the promise in
  // place: the store snapshot is unchanged, useSyncExternalStore bails out, and
  // the parent does not re-render (per https://github.com/reactwg/async-react/discussions/3).
  expect(identities.length).toBe(parentRendersBeforeFirstEmission)
  expect(identities.at(-1)).toBe(pending)
  expect(pending.status).toBe('fulfilled')
  expect(fallbackCount).toBe(fallbacksAfterSuspend)

  await act(async () => {
    subject.next('two')
  })
  await waitFor(() => expect(screen.getByTestId('value').textContent).toBe('two'))
  // Later emissions DO notify the store (snapshot swapped to a pre-fulfilled
  // promise) — the parent re-renders and the reader reads it synchronously.
  expect(identities.length).toBeGreaterThan(parentRendersBeforeFirstEmission)
  expect(identities.at(-1)).not.toBe(pending)
  expect(fallbackCount).toBe(fallbacksAfterSuspend)
})

test('Object.is-equal emission does not re-render the reader', async () => {
  const subject = new Subject<string>()
  let readerRenders = 0

  function CountingReader({promise}: {promise: Promise<string>}) {
    // oxlint-disable-next-line react/todo -- compiler cannot yet lower ++ captured in lambdas
    readerRenders++
    const value = use(promise)
    return <div data-testid="value">{value}</div>
  }

  function Parent() {
    const p = useObservablePromise(subject)
    return (
      <Suspense fallback={<Fallback />}>
        <CountingReader promise={p} />
      </Suspense>
    )
  }

  await renderAsync(<Parent />)
  await act(async () => {
    subject.next('same')
  })
  await waitFor(() => expect(screen.getByTestId('value').textContent).toBe('same'))
  const rendersAfterFirst = readerRenders

  await act(async () => {
    subject.next('same')
  })
  expect(readerRenders).toBe(rendersAfterFirst)
})

test('multiple components share one source subscription and the same promise identity', async () => {
  let subscriptions = 0
  const subject = new Subject<string>()
  const observable = new Observable<string>((subscriber) => {
    subscriptions++
    const sub = subject.subscribe(subscriber)
    return () => sub.unsubscribe()
  })

  const promises: ObservablePromise<string>[] = []

  function Parent() {
    const p1 = useObservablePromise(observable)
    const p2 = useObservablePromise(observable)
    promises.push(p1, p2)
    return (
      <Suspense fallback={<Fallback />}>
        <ReaderA promise={p1} />
        <ReaderB promise={p2} />
      </Suspense>
    )
  }

  await renderAsync(<Parent />)
  expect(subscriptions).toBe(1)
  expect(promises[0]).toBe(promises[1])

  await act(async () => {
    subject.next('shared')
  })
  await waitFor(() => {
    expect(screen.getByTestId('a').textContent).toBe('shared')
    expect(screen.getByTestId('b').textContent).toBe('shared')
  })
  expect(subscriptions).toBe(1)
})

test('error before first value is thrown to the nearest Error Boundary', async () => {
  const observable = throwError(() => new Error('boom-before'))

  function Parent() {
    const p = useObservablePromise(observable)
    return (
      <TestErrorBoundary>
        <Suspense fallback={<Fallback />}>
          <Reader promise={p} />
        </Suspense>
      </TestErrorBoundary>
    )
  }

  await renderAsync(<Parent />)
  await waitFor(() => expect(screen.getByTestId('error').textContent).toContain('boom-before'))
})

test('error after a value is thrown to the nearest Error Boundary', async () => {
  const subject = new Subject<string>()

  function Parent() {
    const p = useObservablePromise(subject)
    return (
      <TestErrorBoundary>
        <Suspense fallback={<Fallback />}>
          <Reader promise={p} />
        </Suspense>
      </TestErrorBoundary>
    )
  }

  await renderAsync(<Parent />)
  await act(async () => {
    subject.next('ok')
  })
  await waitFor(() => expect(screen.getByTestId('value').textContent).toBe('ok'))

  await act(async () => {
    subject.error(new Error('boom-after'))
  })
  await waitFor(() => expect(screen.getByTestId('error').textContent).toContain('boom-after'))
})

test('EMPTY rejects with the real RxJS EmptyError (instanceof holds)', async () => {
  let captured: Error | undefined
  await renderAsync(
    <EmptyParent
      onError={(error) => {
        captured = error
      }}
    />,
  )
  await waitFor(() => {
    const text = screen.getByTestId('error').textContent ?? ''
    expect(text.includes('EmptyError') || text.includes('no elements')).toBe(true)
  })
  // firstValueFrom semantics: the rejection must be the exact RxJS EmptyError
  // type so `instanceof EmptyError` checks in consumer code succeed.
  expect(captured).toBeInstanceOf(EmptyError)
})

test('complete after value keeps data; remount within retention reuses without refetch', async () => {
  let subscriptions = 0
  let resolve!: (value: string) => void
  const promise = new Promise<string>((r) => {
    resolve = r
  })
  const observable = defer(() => {
    subscriptions++
    return from(promise)
  })

  function Parent() {
    const p = useObservablePromise(observable, {ttl: 200})
    return (
      <Suspense fallback={<Fallback />}>
        <Reader promise={p} />
      </Suspense>
    )
  }

  const {unmount} = await renderAsync(<Parent />)
  expect(subscriptions).toBe(1)

  await act(async () => {
    resolve('cached')
    await promise
  })
  await waitFor(() => expect(screen.getByTestId('value').textContent).toBe('cached'))

  unmount()

  // Remount within TTL — should reuse settled promise, no new subscription.
  await renderAsync(<Parent />)
  expect(screen.getByTestId('value').textContent).toBe('cached')
  expect(subscriptions).toBe(1)
})

test('remount after ttl expiry refetches', async () => {
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

  function Parent() {
    const p = useObservablePromise(observable, {ttl: 50})
    return (
      <Suspense fallback={<Fallback />}>
        <Reader promise={p} />
      </Suspense>
    )
  }

  const {unmount} = await renderAsync(<Parent />)
  await act(async () => {
    resolvers[0]!('first')
  })
  await waitFor(() => expect(screen.getByTestId('value').textContent).toBe('first'))
  unmount()

  await wait(80)

  await renderAsync(<Parent />)
  expect(screen.getByTestId('fallback')).toBeTruthy()
  expect(subscriptions).toBe(2)
  await act(async () => {
    resolvers[1]!('second')
  })
  await waitFor(() => expect(screen.getByTestId('value').textContent).toBe('second'))
})

test('extending ttl after unmount keeps a long-lived source connected for the new retention', async () => {
  const subject = new Subject<string>()
  let active = 0
  const observable = new Observable<string>((subscriber) => {
    active++
    const sub = subject.subscribe(subscriber)
    return () => {
      active--
      sub.unsubscribe()
    }
  })

  function Parent() {
    const p = useObservablePromise(observable, {ttl: 40})
    return (
      <Suspense fallback={<Fallback />}>
        <Reader promise={p} />
      </Suspense>
    )
  }

  const {unmount} = await renderAsync(<Parent />)
  await act(async () => {
    subject.next('one')
  })
  await waitFor(() => expect(screen.getByTestId('value').textContent).toBe('one'))
  expect(active).toBe(1)
  unmount()
  expect(active).toBe(1) // share grace still holding the connection

  // Extend retention past the original 40ms grace while the disconnect timer
  // from the short ttl is already running. Without bouncing share's reset,
  // the connection would drop at ~40ms and this emission would be lost.
  void preloadObservablePromise(observable, {ttl: 200})
  await wait(80)
  expect(active).toBe(1)

  await act(async () => {
    subject.next('two')
  })

  await renderAsync(<Parent />)
  expect(screen.getByTestId('value').textContent).toBe('two')
  expect(active).toBe(1)
})

test('same-ttl preload after unmount renews share grace for long-lived sources', async () => {
  const subject = new Subject<string>()
  let active = 0
  const observable = new Observable<string>((subscriber) => {
    active++
    const sub = subject.subscribe(subscriber)
    return () => {
      active--
      sub.unsubscribe()
    }
  })

  function Parent() {
    const p = useObservablePromise(observable, {ttl: 200})
    return (
      <Suspense fallback={<Fallback />}>
        <Reader promise={p} />
      </Suspense>
    )
  }

  const {unmount} = await renderAsync(<Parent />)
  await act(async () => {
    subject.next('one')
  })
  await waitFor(() => expect(screen.getByTestId('value').textContent).toBe('one'))
  unmount()

  // Still inside the original 200ms grace: renew with the same ttl. Without a
  // share bounce the disconnect still fires at unmount+200ms while eviction is
  // pushed to touch+200ms — emissions in that gap are lost.
  await wait(100)
  void preloadObservablePromise(observable, {ttl: 200})
  await wait(150) // ~250ms after unmount, ~150ms after renew — only valid if bounced
  expect(active).toBe(1)

  await act(async () => {
    subject.next('two')
  })
  await renderAsync(<Parent />)
  expect(screen.getByTestId('value').textContent).toBe('two')
})

test('disabled re-renders do not renew grace — entry still evicts for later mounts', async () => {
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

  function Active() {
    const p = useObservablePromise(observable, {ttl: 40})
    return (
      <Suspense fallback={<Fallback />}>
        <Reader promise={p} />
      </Suspense>
    )
  }

  function Disabled({tick}: {tick: number}) {
    // Idle ensure on every render must not reset the eviction clock.
    // void: the return is an ObservablePromise (a Promise subclass); we only
    // care that ensure runs, not that anything awaits the promise.
    void useObservablePromise(observable, {disabled: true, ttl: 40})
    return <span data-testid="tick">{tick}</span>
  }

  const {unmount} = await renderAsync(<Active />)
  await act(async () => {
    resolvers[0]!('first')
  })
  await waitFor(() => expect(screen.getByTestId('value').textContent).toBe('first'))
  unmount()

  const disabled = await renderAsync(<Disabled tick={0} />)
  await act(async () => {
    disabled.rerender(<Disabled tick={1} />)
    disabled.rerender(<Disabled tick={2} />)
  })
  await wait(70)
  disabled.unmount()

  await renderAsync(<Active />)
  expect(screen.getByTestId('fallback')).toBeTruthy()
  expect(subscriptions).toBe(2)
  await act(async () => {
    resolvers[1]!('second')
  })
  await waitFor(() => expect(screen.getByTestId('value').textContent).toBe('second'))
})

test('settled entry is evicted after one retention window, not two', async () => {
  const subject = new Subject<string>()
  let active = 0
  const observable = new Observable<string>((subscriber) => {
    active++
    const sub = subject.subscribe(subscriber)
    return () => {
      active--
      sub.unsubscribe()
    }
  })
  let fallbackCount = 0

  function Parent() {
    const p = useObservablePromise(observable, {ttl: 40})
    return (
      // oxlint-disable-next-line react/todo -- compiler cannot yet lower ++ captured in lambdas
      <Suspense fallback={<Fallback onRender={() => fallbackCount++} />}>
        <Reader promise={p} />
      </Suspense>
    )
  }

  const {unmount} = await renderAsync(<Parent />)
  await act(async () => {
    subject.next('first')
  })
  await waitFor(() => expect(screen.getByTestId('value').textContent).toBe('first'))
  const fallbacksAfterFirst = fallbackCount
  unmount()

  // One retention window (+ slack). If finalize restarted eviction when share
  // disconnected, the entry would still be cached until ~2×ttl and remount
  // would reuse the fulfilled promise (no fallback).
  await wait(70)

  await renderAsync(<Parent />)
  expect(fallbackCount).toBeGreaterThan(fallbacksAfterFirst)
  expect(screen.getByTestId('fallback')).toBeTruthy()
  await act(async () => {
    subject.next('second')
  })
  await waitFor(() => expect(screen.getByTestId('value').textContent).toBe('second'))
})

test('observable swap re-suspends; useDeferredValue keeps previous content', async () => {
  let resolveA!: (value: string) => void
  let resolveB!: (value: string) => void
  const obsA = defer(
    () =>
      new Promise<string>((r) => {
        resolveA = r
      }),
  )
  const obsB = defer(
    () =>
      new Promise<string>((r) => {
        resolveB = r
      }),
  )

  function Parent() {
    const [obs, setObs] = useState(obsA)
    const deferred = useDeferredValue(obs)
    const p = useObservablePromise(deferred)
    return (
      <>
        <button type="button" onClick={() => setObs(obsB)}>
          swap
        </button>
        <Suspense fallback={<Fallback />}>
          <Reader promise={p} />
        </Suspense>
      </>
    )
  }

  await renderAsync(<Parent />)
  await act(async () => {
    resolveA('A')
  })
  await waitFor(() => expect(screen.getByTestId('value').textContent).toBe('A'))

  await act(async () => {
    screen.getByRole('button', {name: 'swap'}).click()
  })
  // Deferred value still A while B loads — previous content stays.
  expect(screen.getByTestId('value').textContent).toBe('A')

  await act(async () => {
    resolveB('B')
    await wait(0)
  })
  await waitFor(() => expect(screen.getByTestId('value').textContent).toBe('B'))
})

test('single-component use(useObservablePromise(obs$)) performs exactly one source subscription', async () => {
  let subscriptions = 0
  let resolve!: (value: string) => void
  const promise = new Promise<string>((r) => {
    resolve = r
  })
  const observable = defer(() => {
    subscriptions++
    return from(promise)
  })

  function Combined() {
    const value = use(useObservablePromise(observable))
    return <div data-testid="value">{value}</div>
  }

  await renderAsync(
    <Suspense fallback={<Fallback />}>
      <Combined />
    </Suspense>,
  )
  expect(subscriptions).toBe(1)

  await act(async () => {
    resolve('once')
    await promise
  })
  await waitFor(() => expect(screen.getByTestId('value').textContent).toBe('once'))
  expect(subscriptions).toBe(1)
})

test('disabled: true from mount performs zero source subscriptions', async () => {
  let subscriptions = 0
  const observable = new Observable<string>((subscriber) => {
    subscriptions++
    subscriber.next('x')
  })

  function Parent() {
    const p = useObservablePromise(observable, {disabled: true})
    return (
      <Suspense fallback={<Fallback />}>
        <div data-testid="status">{p.status}</div>
      </Suspense>
    )
  }

  await renderAsync(<Parent />)
  expect(subscriptions).toBe(0)
  expect(screen.getByTestId('status').textContent).toBe('pending')
})

test('flipping disabled to false starts the fetch and resolves the same promise instance', async () => {
  let subscriptions = 0
  let resolve!: (value: string) => void
  const promise = new Promise<string>((r) => {
    resolve = r
  })
  const observable = defer(() => {
    subscriptions++
    return from(promise)
  })

  const identities: ObservablePromise<string>[] = []
  function TrackingParent() {
    const [disabled, setDisabled] = useState(true)
    const p = useObservablePromise(observable, {disabled})
    identities.push(p)
    return (
      <>
        <button type="button" onClick={() => setDisabled(false)}>
          enable
        </button>
        <Suspense fallback={<Fallback />}>
          {disabled ? <div data-testid="waiting">{p.status}</div> : <Reader promise={p} />}
        </Suspense>
      </>
    )
  }

  await renderAsync(<TrackingParent />)
  expect(subscriptions).toBe(0)
  const pending = identities[0]!

  await act(async () => {
    screen.getByRole('button', {name: 'enable'}).click()
  })
  expect(subscriptions).toBe(1)
  expect(identities.at(-1)).toBe(pending)

  await act(async () => {
    resolve('enabled')
    await promise
  })
  await waitFor(() => expect(screen.getByTestId('value').textContent).toBe('enabled'))
  expect(pending.status).toBe('fulfilled')
})

test('disabled component sharing a warmed entry gets the settled promise', async () => {
  const observable = of('warm')

  function Warmed() {
    const p = useObservablePromise(observable)
    return (
      <Suspense fallback={<Fallback />}>
        <Reader promise={p} />
      </Suspense>
    )
  }

  function Disabled() {
    const p = useObservablePromise(observable, {disabled: true})
    return (
      <div data-testid="disabled-status">
        {p.status}:{(p as {value?: string}).value}
      </div>
    )
  }

  await renderAsync(
    <>
      <Warmed />
      <Disabled />
    </>,
  )
  expect(screen.getByTestId('value').textContent).toBe('warm')
  expect(screen.getByTestId('disabled-status').textContent).toBe('fulfilled:warm')
})

test('does not warn about uncached promises in DEV', async () => {
  const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
  const subject = new Subject<string>()

  function Parent() {
    const p = useObservablePromise(subject)
    return (
      <Suspense fallback={<Fallback />}>
        <Reader promise={p} />
      </Suspense>
    )
  }

  await renderAsync(<Parent />)
  await act(async () => {
    subject.next('ok')
  })
  await waitFor(() => expect(screen.getByTestId('value').textContent).toBe('ok'))

  const uncached = spy.mock.calls.some((args) => String(args[0] ?? '').includes('uncached promise'))
  expect(uncached).toBe(false)
  spy.mockRestore()
})

test('preloadObservablePromise starts the fetch with nothing mounted', async () => {
  let subscriptions = 0
  let resolve!: (value: string) => void
  const promise = new Promise<string>((r) => {
    resolve = r
  })
  const observable = defer(() => {
    subscriptions++
    return from(promise)
  })

  const preloaded = preloadObservablePromise(observable, {ttl: 200})
  expect(subscriptions).toBe(1)
  expect(preloaded.status).toBe('pending')

  await act(async () => {
    resolve('pre')
    await promise
  })
  expect(preloaded.status).toBe('fulfilled')
})

test('mount mid-flight after preload shares the subscription (total = 1)', async () => {
  let subscriptions = 0
  let resolve!: (value: string) => void
  const promise = new Promise<string>((r) => {
    resolve = r
  })
  const observable = defer(() => {
    subscriptions++
    return from(promise)
  })

  const preloaded = preloadObservablePromise(observable, {ttl: 500})

  function Parent() {
    const p = useObservablePromise(observable)
    expect(p).toBe(preloaded)
    return (
      <Suspense fallback={<Fallback />}>
        <Reader promise={p} />
      </Suspense>
    )
  }

  await renderAsync(<Parent />)
  expect(subscriptions).toBe(1)
  expect(screen.getByTestId('fallback')).toBeTruthy()

  await act(async () => {
    resolve('shared-flight')
    await promise
  })
  await waitFor(() => expect(screen.getByTestId('value').textContent).toBe('shared-flight'))
  expect(subscriptions).toBe(1)
})

test('mount after preload settle within ttl renders with zero fallbacks', async () => {
  let fallbackCount = 0
  const observable = of('ready')
  void preloadObservablePromise(observable, {ttl: 500})

  function Parent() {
    const p = useObservablePromise(observable)
    return (
      // oxlint-disable-next-line react/todo -- compiler cannot yet lower ++ captured in lambdas
      <Suspense fallback={<Fallback onRender={() => fallbackCount++} />}>
        <Reader promise={p} />
      </Suspense>
    )
  }

  await renderAsync(<Parent />)
  expect(screen.getByTestId('value').textContent).toBe('ready')
  expect(fallbackCount).toBe(0)
})

test('preload is idempotent', async () => {
  const observable = of('x')
  const a = preloadObservablePromise(observable)
  const b = preloadObservablePromise(observable)
  expect(a).toBe(b)
})

test('preloaded-never-consumed entry unsubscribes and evicts after ttl', async () => {
  let active = 0
  const subject = new BehaviorSubject('v')
  const observable = new Observable<string>((subscriber) => {
    active++
    const sub = subject.subscribe(subscriber)
    return () => {
      active--
      sub.unsubscribe()
    }
  })

  void preloadObservablePromise(observable, {ttl: 50})
  expect(active).toBe(1)

  await wait(80)
  expect(active).toBe(0)

  // After eviction, a new preload starts a fresh subscription.
  void preloadObservablePromise(observable, {ttl: 50})
  expect(active).toBe(1)
})

test('BehaviorSubject is available synchronously without fallback', async () => {
  const subject = new BehaviorSubject('bs')
  let fallbackCount = 0

  function Parent() {
    const p = useObservablePromise(subject)
    return (
      // oxlint-disable-next-line react/todo -- compiler cannot yet lower ++ captured in lambdas
      <Suspense fallback={<Fallback onRender={() => fallbackCount++} />}>
        <Reader promise={p} />
      </Suspense>
    )
  }

  await renderAsync(<Parent />)
  expect(screen.getByTestId('value').textContent).toBe('bs')
  expect(fallbackCount).toBe(0)
})

test('rapid emissions while suspended converge to the latest value', async () => {
  const subject = new Subject<string>()

  function Parent() {
    const p = useObservablePromise(subject)
    return (
      <Suspense fallback={<Fallback />}>
        <Reader promise={p} />
      </Suspense>
    )
  }

  await renderAsync(<Parent />)
  await act(async () => {
    subject.next('a')
    subject.next('b')
    subject.next('c')
  })
  await waitFor(() => expect(screen.getByTestId('value').textContent).toBe('c'))
})

test('observable identity change without deferred value re-suspends', async () => {
  let resolveA!: (value: string) => void
  let resolveB!: (value: string) => void
  const obsA = defer(
    () =>
      new Promise<string>((r) => {
        resolveA = r
      }),
  )
  const obsB = defer(
    () =>
      new Promise<string>((r) => {
        resolveB = r
      }),
  )

  function Parent() {
    const [obs, setObs] = useState(obsA)
    const p = useObservablePromise(obs)
    return (
      <>
        <button type="button" onClick={() => setObs(obsB)}>
          swap
        </button>
        <Suspense fallback={<Fallback />}>
          <Reader promise={p} />
        </Suspense>
      </>
    )
  }

  await renderAsync(<Parent />)
  await act(async () => {
    resolveA('A')
  })
  await waitFor(() => expect(screen.getByTestId('value').textContent).toBe('A'))

  await act(async () => {
    screen.getByRole('button', {name: 'swap'}).click()
  })
  expect(screen.getByTestId('fallback')).toBeTruthy()

  await act(async () => {
    resolveB('B')
  })
  await waitFor(() => expect(screen.getByTestId('value').textContent).toBe('B'))
})

test('memoized observable is stable across parent re-renders', async () => {
  let subscriptions = 0
  const factory = () =>
    new Observable<string>((subscriber) => {
      subscriptions++
      subscriber.next('m')
    })

  function Parent() {
    const [, setTick] = useState(0)
    const observable = useMemo(() => factory(), [])
    const p = useObservablePromise(observable)
    return (
      <>
        <button type="button" onClick={() => setTick((t) => t + 1)}>
          tick
        </button>
        <Suspense fallback={<Fallback />}>
          <Reader promise={p} />
        </Suspense>
      </>
    )
  }

  await renderAsync(<Parent />)
  expect(screen.getByTestId('value').textContent).toBe('m')
  expect(subscriptions).toBe(1)
  await act(async () => {
    screen.getByRole('button', {name: 'tick'}).click()
  })
  expect(subscriptions).toBe(1)
})

test('the default TTL constants are public API: DEFAULT_HOOK_TTL=500, DEFAULT_PRELOAD_TTL=5000', () => {
  // Consumers (and this package's docs) rely on these retention defaults; changing
  // them changes refetch behavior for every hook call without an explicit ttl.
  expect(DEFAULT_HOOK_TTL).toBe(500)
  expect(DEFAULT_PRELOAD_TTL).toBe(5000)
})

// ---------------------------------------------------------------------------
// The WithReferencedAsset pattern, vendored from sanity
// (packages/sanity/src/core/form/utils/WithReferencedAsset.tsx): swap to the NEVER
// singleton and `disabled: true` when there is no document id, keep the placeholder up
// for falsy emissions, and key the promise to the observable identity so a reference
// change never shows the previous document's asset.
// ---------------------------------------------------------------------------

interface AssetReference {
  _ref?: string
}

// Concrete asset type instead of sanity's generic parameter: the observable emitting
// `null` for missing documents is part of the tested behavior, and the concrete union
// lets the truthiness check below narrow it.
interface AssetDoc {
  title: string
}

function ReferencedAsset(props: {
  promise: ObservablePromise<AssetDoc | null>
  children: (assetDocument: AssetDoc) => ReactNode
  waitPlaceholder?: ReactNode
}) {
  const asset = use(props.promise)
  // observeAsset implementations emit null while the referenced document is missing or
  // not yet indexed — keep the placeholder up for falsy emissions.
  return <>{asset ? props.children(asset) : props.waitPlaceholder}</>
}

function WithReferencedAsset(props: {
  reference: AssetReference
  observeAsset: (assetId: string) => Observable<AssetDoc | null>
  children: (assetDocument: AssetDoc) => ReactNode
  waitPlaceholder?: ReactNode
}) {
  const {reference, children, observeAsset, waitPlaceholder} = props
  const documentId = reference?._ref
  // Never invoke `observeAsset` without an id: some implementations parse the id
  // synchronously at call time and would throw during render.
  const observable = useMemo(
    () => (documentId ? observeAsset(documentId) : NEVER),
    [documentId, observeAsset],
  )
  const promise = useObservablePromise(observable, {disabled: !documentId})
  if (!documentId) {
    return <>{waitPlaceholder}</>
  }
  return (
    <Suspense fallback={waitPlaceholder}>
      <ReferencedAsset promise={promise} waitPlaceholder={waitPlaceholder}>
        {children}
      </ReferencedAsset>
    </Suspense>
  )
}

function Placeholder() {
  return <div data-testid="placeholder">wait</div>
}

function AssetTitle({title}: {title: string}) {
  return <div data-testid="asset">{title}</div>
}

test('WithReferencedAsset without a reference: placeholder renders, observeAsset is never called, nothing fetches', async () => {
  const observeAsset = vi.fn((id: string) => of({title: `asset ${id}`}))

  const {rerender} = await renderAsync(
    <WithReferencedAsset
      reference={{}}
      observeAsset={observeAsset}
      waitPlaceholder={<Placeholder />}
    >
      {(asset) => <AssetTitle title={asset.title} />}
    </WithReferencedAsset>,
  )

  expect(screen.getByTestId('placeholder')).toBeTruthy()
  expect(screen.queryByTestId('asset')).toBeNull()
  expect(observeAsset).not.toHaveBeenCalled()

  // Re-renders keep hitting the NEVER + disabled path without starting anything.
  rerender(
    <WithReferencedAsset
      reference={{}}
      observeAsset={observeAsset}
      waitPlaceholder={<Placeholder />}
    >
      {(asset) => <AssetTitle title={asset.title} />}
    </WithReferencedAsset>,
  )
  expect(observeAsset).not.toHaveBeenCalled()
})

test('assigning a reference flips disabled off: suspends into the placeholder, then shows the asset', async () => {
  const responses = new Map<string, Subject<{title: string} | null>>()
  let sourceSubscriptions = 0
  const observeAsset = vi.fn(
    (id: string) =>
      new Observable<{title: string} | null>((subscriber) => {
        sourceSubscriptions++
        if (!responses.has(id)) {
          responses.set(id, new Subject())
        }
        const subscription = responses.get(id)!.subscribe(subscriber)
        return () => subscription.unsubscribe()
      }),
  )

  const view = await renderAsync(
    <WithReferencedAsset
      reference={{}}
      observeAsset={observeAsset}
      waitPlaceholder={<Placeholder />}
    >
      {(asset) => <AssetTitle title={asset.title} />}
    </WithReferencedAsset>,
  )
  expect(observeAsset).not.toHaveBeenCalled()

  // The reference gets a _ref: the observable swaps from NEVER to the real source and
  // `disabled` flips to false in the same render.
  await act(async () => {
    view.rerender(
      <WithReferencedAsset
        reference={{_ref: 'image-1'}}
        observeAsset={observeAsset}
        waitPlaceholder={<Placeholder />}
      >
        {(asset) => <AssetTitle title={asset.title} />}
      </WithReferencedAsset>,
    )
  })

  expect(observeAsset).toHaveBeenCalledTimes(1)
  expect(sourceSubscriptions).toBe(1)
  // Pending: the Suspense boundary shows the placeholder.
  expect(screen.getByTestId('placeholder')).toBeTruthy()
  expect(screen.queryByTestId('asset')).toBeNull()

  // A null emission (missing / not yet indexed document) fulfills the promise but the
  // consumer keeps the placeholder up.
  await act(async () => {
    responses.get('image-1')!.next(null)
  })
  expect(screen.getByTestId('placeholder')).toBeTruthy()
  expect(screen.queryByTestId('asset')).toBeNull()

  // The real asset arrives: content swaps in with no re-suspension.
  await act(async () => {
    responses.get('image-1')!.next({title: 'first title'})
  })
  await waitFor(() => expect(screen.getByTestId('asset').textContent).toBe('first title'))

  // Later emissions keep updating without going back to the placeholder.
  await act(async () => {
    responses.get('image-1')!.next({title: 'updated title'})
  })
  expect(screen.getByTestId('asset').textContent).toBe('updated title')
  expect(screen.queryByTestId('placeholder')).toBeNull()

  // Still a single observeAsset call / subscription for the whole lifecycle.
  expect(observeAsset).toHaveBeenCalledTimes(1)
  expect(sourceSubscriptions).toBe(1)
})

test('changing the reference never renders the previous asset under the new one', async () => {
  const responses = new Map<string, Subject<{title: string} | null>>()
  const observeAsset = vi.fn(
    (id: string) =>
      new Observable<{title: string} | null>((subscriber) => {
        if (!responses.has(id)) {
          responses.set(id, new Subject())
        }
        const subscription = responses.get(id)!.subscribe(subscriber)
        return () => subscription.unsubscribe()
      }),
  )

  const view = await renderAsync(
    <WithReferencedAsset
      reference={{_ref: 'image-1'}}
      observeAsset={observeAsset}
      waitPlaceholder={<Placeholder />}
    >
      {(asset) => <AssetTitle title={asset.title} />}
    </WithReferencedAsset>,
  )
  await act(async () => {
    responses.get('image-1')!.next({title: 'asset one'})
  })
  await waitFor(() => expect(screen.getByTestId('asset').textContent).toBe('asset one'))

  // Point the reference at another document. The promise is keyed to the observable
  // identity (and thereby the id), so the boundary re-suspends into the placeholder.
  // React keeps the previously revealed content in the DOM but hides it
  // (display: none) — the previous document's asset is never *visible* under the new
  // reference.
  await act(async () => {
    view.rerender(
      <WithReferencedAsset
        reference={{_ref: 'image-2'}}
        observeAsset={observeAsset}
        waitPlaceholder={<Placeholder />}
      >
        {(asset) => <AssetTitle title={asset.title} />}
      </WithReferencedAsset>,
    )
  })
  expect(screen.getByTestId('placeholder')).toBeTruthy()
  expect(screen.getByTestId('asset').style.display).toBe('none')

  await act(async () => {
    responses.get('image-2')!.next({title: 'asset two'})
  })
  await waitFor(() => expect(screen.getByTestId('asset').textContent).toBe('asset two'))
  expect(screen.getByTestId('asset').style.display).not.toBe('none')
  expect(observeAsset).toHaveBeenCalledTimes(2)
})

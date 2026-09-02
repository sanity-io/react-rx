import {act, render, renderHook} from '@testing-library/react'
import {startTransition, useMemo} from 'react'
import {renderToString} from 'react-dom/server'
import {
  asyncScheduler,
  BehaviorSubject,
  defer,
  map,
  Observable,
  of,
  ReplaySubject,
  scheduled,
  share,
  Subject,
  throwError,
  timer,
} from 'rxjs'
import {expect, test} from 'vitest'

import type {UseObservableOptions} from '../types'
import {useObservable} from '../useObservable'

test('should subscribe immediately on component mount and unsubscribe on component unmount', async () => {
  let subscribed = false
  const observable = new Observable(() => {
    subscribed = true
    return () => {
      subscribed = false
    }
  })

  expect(subscribed).toBe(false)

  const {unmount} = renderHook(() => useObservable(observable))
  expect(subscribed).toBe(true)

  unmount()
  await Promise.resolve()
  expect(subscribed).toBe(false)
})

test('should only subscribe once when given same observable on re-renders', async () => {
  let subscriptionCount = 0
  const observable = new Observable(() => {
    subscriptionCount++
  })

  expect(subscriptionCount).toBe(0)

  const {unmount, rerender} = renderHook(() => useObservable(observable))
  expect(subscriptionCount).toBe(1)
  rerender()
  expect(subscriptionCount).toBe(1)
  unmount()
  await Promise.resolve()

  renderHook(() => useObservable(observable))
  expect(subscriptionCount).toBe(2)
})

test('should not return undefined during render if initial value is given', () => {
  const observable = timer(100).pipe(map(() => 'emitted value'))

  const returnedValues: unknown[] = []
  function ObservableComponent() {
    const observedValue = useObservable(observable, 'initial value')
    returnedValues.push(observedValue)
    return <>{observedValue}</>
  }
  render(<ObservableComponent />)
  expect(returnedValues).toEqual(expect.arrayContaining(['initial value']))
})

test('should not return undefined during render if observable is sync', () => {
  const observable = of('initial value')

  const returnedValues: unknown[] = []
  function ObservableComponent() {
    const observedValue = useObservable(observable)
    returnedValues.push(observedValue)
    return <>{observedValue}</>
  }
  render(<ObservableComponent />)
  expect(returnedValues).toEqual(expect.arrayContaining(['initial value']))
})

test('should return undefined during first render if observable is async', () => {
  const observable = scheduled('async value', asyncScheduler)

  const returnedValues: unknown[] = []
  function ObservableComponent() {
    const observedValue = useObservable(observable)
    returnedValues.push(observedValue)
    return <>{observedValue}</>
  }
  render(<ObservableComponent />)
  expect(returnedValues).toEqual(expect.arrayContaining([undefined]))
})

test('should have sync values from an observable as initial value', () => {
  const observable = of('something sync')
  const {result} = renderHook(() => useObservable(observable))
  expect(result.current).toBe('something sync')
})

test('should have undefined as initial value from delayed observables', () => {
  const {result, unmount} = renderHook(() =>
    useObservable(scheduled('something async', asyncScheduler)),
  )
  expect(result.current).toBeUndefined()
  unmount()
})

test('should have passed initialValue as initial value from delayed observables', () => {
  const {result, unmount} = renderHook(() =>
    useObservable(scheduled('something async', asyncScheduler), 'initial'),
  )
  expect(result.current).toBe('initial')
  unmount()
})

test('should rerender with initial value if component unmounts and then remounts', async () => {
  const values$ = new Subject<string>()
  const firstHook = renderHook(() => useObservable(values$, 'initial'))

  expect(firstHook.result.current).toBe('initial')

  act(() => values$.next('something'))
  expect(firstHook.result.current).toBe('something')

  firstHook.unmount()
  await Promise.resolve()

  const nextHook = renderHook(() => useObservable(values$, 'initial2'))

  expect(nextHook.result.current).toBe('initial2')
})

test('should share the observable between each concurrent subscribing hook', async () => {
  let subscribeCount = 0
  const observable = new Observable<number>((subscriber) => {
    subscriber.next(subscribeCount++)
  })
  const firstHook = renderHook(() => useObservable(observable))
  expect(firstHook.result.current).toBe(0)
  const secondHook = renderHook(() => useObservable(observable))
  expect(secondHook.result.current).toBe(0)
  firstHook.unmount()
  secondHook.unmount()
  await Promise.resolve()

  const thirdHook = renderHook(() => useObservable(observable))
  expect(thirdHook.result.current).toBe(1)
  thirdHook.unmount()
})

test('should restart any completed observable on mount', async () => {
  let subscribeCount = 0
  let unsubscribeCount = 0

  type Notification<T> =
    | {kind: 'next'; value: T}
    | {kind: 'error'; error: Error}
    | {kind: 'complete'}

  const notifications$ = new Subject<Notification<string>>()

  const observable = new Observable<string>((subscriber) => {
    subscribeCount++
    const subscription = notifications$.subscribe((notification) => {
      if (notification.kind === 'next') {
        subscriber.next(notification.value)
      } else if (notification.kind === 'error') {
        subscriber.error(notification.error)
      } else if (notification.kind === 'complete') {
        subscriber.complete()
      }
    })
    return () => {
      unsubscribeCount++
      subscription.unsubscribe()
    }
  }).pipe(share({connector: () => new ReplaySubject(1)}))

  const firstHook = renderHook(() => useObservable(observable, 'initial'))
  expect(firstHook.result.current).toBe('initial')

  act(() => notifications$.next({kind: 'next', value: 'something'}))
  expect(firstHook.result.current).toBe('something')
  act(() => notifications$.next({kind: 'complete'}))
  expect(firstHook.result.current).toBe('something')
  act(() => notifications$.next({kind: 'next', value: 'after complete'}))
  expect(firstHook.result.current).toBe('something')

  expect(subscribeCount).toBe(1)
  expect(unsubscribeCount).toBe(1)

  firstHook.unmount()
  await Promise.resolve()

  const secondHook = renderHook(() => useObservable(observable))
  expect(secondHook.result.current).toBe(undefined)
  expect(subscribeCount).toBe(2)
  expect(unsubscribeCount).toBe(1)
  secondHook.unmount()
  await Promise.resolve()

  expect(unsubscribeCount).toBe(2)
})

test('should update with values from observables', () => {
  const values$ = new Subject<string>()
  const {result, unmount} = renderHook(() => useObservable(values$))

  expect(result.current).toBe(undefined)

  act(() => values$.next('something'))
  expect(result.current).toBe('something')

  act(() => values$.next('otherthing'))
  expect(result.current).toBe('otherthing')
  unmount()
})

test('should re-subscribe when receiving a new observable', () => {
  const first$ = new Subject<string>()
  const second$ = new Subject<string>()

  let current$ = first$

  const {result, rerender, unmount} = renderHook(() => useObservable(current$, '!!initial!!'))

  act(() => first$.next('first 1'))
  expect(result.current).toBe('first 1')

  current$ = second$

  rerender()

  // since observable #2 hasn't emitted a value yet, we should use the initial value
  expect(result.current).toBe('!!initial!!')

  // Now we should be subscribed to second$ and it's emission should be returned
  act(() => second$.next('second 1'))
  expect(result.current).toBe('second 1')

  // we should no longer be subscribed to the first and ignore any emissions
  act(() => first$.next('first 2'))
  expect(result.current).toBe('second 1')

  unmount()
})

test('falls back to the live value when the observable identity changes (deferral is identity-coherent)', () => {
  const subjectA = new BehaviorSubject('value for a')
  const subjectB = new BehaviorSubject('initial for b')
  const renderTimeline: string[] = []

  function ObservableComponent({observable}: {observable: BehaviorSubject<string>}) {
    renderTimeline.push(useObservable(observable, 'fallback'))
    return null
  }
  const {rerender, unmount} = render(<ObservableComponent observable={subjectA} />)
  expect(renderTimeline.at(-1)).toBe('value for a')

  const timelineLengthBeforeSwitch = renderTimeline.length
  rerender(<ObservableComponent observable={subjectB} />)

  // The render right after the identity change must reflect the new observable —
  // replacement observables are warmed up during render even with an initialValue, so
  // subjectB's synchronous emission is available immediately. It never shows the deferred
  // snapshot belonging to the previous observable.
  expect(renderTimeline[timelineLengthBeforeSwitch]).toBe('initial for b')
  expect(renderTimeline.slice(timelineLengthBeforeSwitch)).not.toContain('value for a')

  act(() => subjectB.next('updated for b'))
  expect(renderTimeline.at(-1)).toBe('updated for b')

  unmount()
})

test('identity change without an initialValue renders the new observable synchronous emission immediately (warm-up)', () => {
  const subjectA = new BehaviorSubject('value for a')
  const subjectB = new BehaviorSubject('initial for b')
  const renderTimeline: (string | undefined)[] = []

  function ObservableComponent({observable}: {observable: BehaviorSubject<string>}) {
    renderTimeline.push(useObservable(observable))
    return null
  }
  const {rerender, unmount} = render(<ObservableComponent observable={subjectA} />)
  expect(renderTimeline.at(-1)).toBe('value for a')

  const timelineLengthBeforeSwitch = renderTimeline.length
  rerender(<ObservableComponent observable={subjectB} />)

  // Without an initialValue the warm-up runs during the switch render, so the very first
  // render after the identity change already shows subjectB's synchronous emission.
  expect(renderTimeline[timelineLengthBeforeSwitch]).toBe('initial for b')
  expect(renderTimeline.slice(timelineLengthBeforeSwitch)).not.toContain('value for a')

  unmount()
})

test('identity change to an async observable renders the initialValue immediately, never the previous value', () => {
  const subjectA = new BehaviorSubject('value for a')
  const subjectB = new Subject<string>()
  const renderTimeline: string[] = []

  function ObservableComponent({observable}: {observable: Observable<string>}) {
    renderTimeline.push(useObservable(observable, 'initial'))
    return null
  }
  const {rerender, unmount} = render(<ObservableComponent observable={subjectA} />)
  expect(renderTimeline.at(-1)).toBe('value for a')

  const timelineLengthBeforeSwitch = renderTimeline.length
  rerender(<ObservableComponent observable={subjectB} />)

  // The new observable has not emitted yet, so the urgent render right after the
  // switch shows the initialValue — not the previous observable's deferred value.
  expect(renderTimeline[timelineLengthBeforeSwitch]).toBe('initial')
  expect(renderTimeline.slice(timelineLengthBeforeSwitch)).not.toContain('value for a')

  act(() => subjectB.next('value for b'))
  expect(renderTimeline.at(-1)).toBe('value for b')

  unmount()
})

test('should return undefined if observable emits undefined, also when given initial value', () => {
  const values$ = new Subject<string | undefined>()
  const {result, unmount} = renderHook(() => useObservable(values$, 'initial'))

  expect(result.current).toBe('initial')

  act(() => values$.next(undefined))

  expect(result.current).toBe(undefined)

  unmount()
})

test('should return undefined if observable emits undefined, also when given initial value, and also when unsubscribe + resubscribe', () => {
  // Deferred updates produce urgent+deferred render pairs, so we assert the sequence of
  // *distinct* committed values rather than every render pass (mountDeferredValueImpl /
  // updateDeferredValueImpl may also insert Object.is bail-out passes).
  const snapshots: (string | undefined)[] = []
  const subject = new Subject<string | undefined>()

  function ObservableComponent(props: {prefix: string}) {
    // will create a new observable every time prefix changes
    const observable = useMemo(
      () => subject.pipe(map((v) => (typeof v === 'string' ? `${props.prefix}-${v}` : v))),
      [props.prefix],
    )
    snapshots.push(useObservable(observable, 'initial'))
    return null
  }

  const {unmount, rerender} = render(<ObservableComponent prefix="first" />)
  act(() => subject.next('foo'))
  act(() => subject.next(undefined))
  act(() => subject.next('bar'))

  // now change the prefix
  rerender(<ObservableComponent prefix="second" />)
  act(() => subject.next('foo again'))
  act(() => subject.next(undefined))
  act(() => subject.next('bar again'))

  const distinct: (string | undefined)[] = []
  for (const value of snapshots) {
    if (distinct.length === 0 || !Object.is(distinct.at(-1), value)) {
      distinct.push(value)
    }
  }
  expect(distinct).toEqual([
    'initial',
    'first-foo',
    undefined,
    'first-bar',
    'initial',
    'second-foo again',
    undefined,
    'second-bar again',
  ])
  unmount()
})

test('should not receive updates while disabled', () => {
  const values$ = new Subject<string | undefined>()
  const {result, unmount} = renderHook(() => useObservable(values$, 'initial', {disabled: true}))

  act(() => values$.next('something'))
  expect(result.current).toBe('initial')

  unmount()
})

test('should return the last value instead of the initial value when the hook is disabled after running', () => {
  const values$ = new Subject<string | undefined>()
  const {result, unmount, rerender} = renderHook<string | undefined, UseObservableOptions>(
    (props) => useObservable(values$, 'initial', props),
  )
  expect(result.current).toBe('initial')
  act(() => values$.next('something'))
  expect(result.current).toBe('something')

  rerender({
    disabled: true,
  })

  act(() => values$.next('something else'))

  expect(result.current).toBe('something')

  unmount()
})

test('should return the actual value when the hook is disabled and then re-enabled', () => {
  const values$ = new Subject<string | undefined>()
  const {result, unmount, rerender} = renderHook<string | undefined, UseObservableOptions>(
    (props) => useObservable(values$, 'initial', props),
  )
  expect(result.current).toBe('initial')
  act(() => values$.next('something'))
  expect(result.current).toBe('something')

  rerender({
    disabled: true,
  })

  act(() => values$.next('something else'))

  expect(result.current).toBe('something')

  act(() => values$.next('something again'))

  expect(result.current).toBe('something')

  rerender({
    disabled: false,
  })

  expect(result.current).toBe('something again')

  act(() => values$.next('something ending'))

  expect(result.current).toBe('something ending')

  unmount()
})

test('sync emission wins over an omitted initialValue on the first render (warm-up)', () => {
  // Without an initialValue the observable is briefly subscribed during render, so the sync
  // emission is the very first rendered value — never undefined.
  const returnedValues: unknown[] = []
  function ObservableComponent() {
    returnedValues.push(useObservable(of('sync')))
    return null
  }
  render(<ObservableComponent />)
  expect(returnedValues[0]).toBe('sync')
  expect(returnedValues.every((v) => v === 'sync')).toBe(true)
})

test('an initialValue skips the render-phase warm-up: the initialValue paints first, the sync emission follows after mount', () => {
  // With an initialValue there is nothing to warm up for — the source is first subscribed by
  // the live store subscription on commit, keeping subscribe-time side effects out of the
  // render phase.
  let subscriptions = 0
  const source = defer(() => {
    subscriptions++
    return of('sync')
  })
  const seen: Array<{value: unknown; subscriptionsAtRender: number}> = []
  function ObservableComponent() {
    const value = useObservable(source, 'initial')
    seen.push({value, subscriptionsAtRender: subscriptions})
    return null
  }
  render(<ObservableComponent />)
  // The first render happened before any subscription — no render-phase side effects.
  expect(seen[0]).toEqual({value: 'initial', subscriptionsAtRender: 0})
  // The store subscription on commit delivers the sync emission right after mount.
  expect(seen.at(-1)!.value).toBe('sync')
  expect(subscriptions).toBe(1)
})

test('disabled with an initialValue never subscribes the source (zero subscriptions)', () => {
  // Without an initialValue, `disabled` still runs the warm-up subscription; with one, there
  // is no render-phase warm-up and `disabled` pauses the store subscription — so nothing ever
  // subscribes the source.
  let subscriptions = 0
  const source = defer(() => {
    subscriptions++
    return of('sync')
  })
  const {result, unmount} = renderHook(() => useObservable(source, 'initial', {disabled: true}))
  expect(result.current).toBe('initial')
  expect(subscriptions).toBe(0)
  unmount()
})

test('a consumer without an initialValue warms up a shared entry created by an initialValue consumer', () => {
  // `WithInitial` renders first and creates the shared cache entry without warming it up;
  // `WithoutInitial` relies on sync emissions being available on its first render, so the
  // cache hit warms the entry up on its behalf.
  const source = of('sync')
  const withInitial: unknown[] = []
  const withoutInitial: unknown[] = []
  function WithInitial() {
    withInitial.push(useObservable(source, 'initial'))
    return null
  }
  function WithoutInitial() {
    withoutInitial.push(useObservable(source))
    return null
  }
  render(
    <>
      <WithInitial />
      <WithoutInitial />
    </>,
  )
  expect(withInitial[0]).toBe('initial')
  expect(withoutInitial[0]).toBe('sync')
  // Once the entry is warm, the initialValue consumer reads the emitted snapshot too.
  expect(withInitial.at(-1)).toBe('sync')
})

test('remount shows the cached snapshot immediately, never the initialValue', async () => {
  const values$ = new Subject<string>()
  // Keep a second subscriber mounted so the module cache entry stays alive across remount.
  const keeper = renderHook(() => useObservable(values$, 'initial'))

  const log: unknown[] = []
  function Probe() {
    log.push(useObservable(values$, 'initial'))
    return null
  }

  const first = render(<Probe />)
  act(() => values$.next('a'))
  expect(log.at(-1)).toBe('a')

  first.unmount()
  log.length = 0

  render(<Probe />)
  expect(log).not.toContain('initial')
  expect(log[0]).toBe('a')

  keeper.unmount()
  await Promise.resolve()
})

test('an emission re-renders urgently with the previous value, then defers the new one', () => {
  const values$ = new Subject<string>()
  const returnedValues: unknown[] = []
  function ObservableComponent() {
    returnedValues.push(useObservable(values$, 'initial'))
    return null
  }
  render(<ObservableComponent />)
  // Mount may include a bail-out deferred pass that also returns 'initial'.
  expect(returnedValues.every((v) => v === 'initial')).toBe(true)
  const mountPasses = returnedValues.length

  act(() => values$.next('a'))
  // Urgent pass returns previous value ('initial'), then deferred pass returns 'a'.
  expect(returnedValues.slice(mountPasses)).toEqual(['initial', 'a'])
})

test('emitting an identical value does not re-render', () => {
  const values$ = new Subject<string>()
  let renderCount = 0
  function ObservableComponent() {
    // oxlint-disable-next-line react/todo -- compiler cannot yet lower ++ captured in lambdas
    renderCount++
    useObservable(values$, 'same')
    return null
  }
  render(<ObservableComponent />)
  const afterMount = renderCount

  act(() => values$.next('same'))
  expect(renderCount).toBe(afterMount)
})

test('store mutation inside startTransition still applies (uSES updates cannot be transitions)', () => {
  // Caveat from https://react.dev/reference/react/useSyncExternalStore#caveats :
  // if the store is mutated during a Transition, React falls back to a blocking update.
  const values$ = new Subject<string>()
  const {result} = renderHook(() => useObservable(values$, 'initial'))

  act(() => {
    startTransition(() => {
      values$.next('x')
    })
  })

  expect(result.current).toBe('x')
})

test('initialValue factories run once per hook instance, like useState initializers', () => {
  const values$ = new Subject<string>()
  let factoryCalls = 0
  const factory = () => {
    factoryCalls++
    return 'initial'
  }

  const {result, rerender} = renderHook(() => useObservable(values$, factory))
  expect(factoryCalls).toBe(1)
  expect(result.current).toBe('initial')

  rerender()
  expect(factoryCalls).toBe(1)

  act(() => values$.next('emitted'))
  expect(result.current).toBe('emitted')
  expect(factoryCalls).toBe(1)
})

test('initializers returning fresh objects render without looping, and the reference is stable', () => {
  const values$ = new Subject<{label: string}>()
  let initializerCalls = 0

  const {result, rerender} = renderHook(() =>
    useObservable(values$, () => {
      initializerCalls++
      return {label: 'initial'}
    }),
  )
  expect(initializerCalls).toBe(1)
  expect(result.current).toEqual({label: 'initial'})
  const first = result.current

  rerender()
  expect(result.current).toBe(first)
  expect(initializerCalls).toBe(1)
})

test('SSR renders the initialValue even when the observable emits synchronously', () => {
  // With an initialValue there is no render-phase warm-up, so the server never sees the sync
  // emission: it paints the resolved initialValue — exactly what the client's first paint
  // will show.
  const observable = of('server-sync')
  function ObservableComponent() {
    return <>{useObservable(observable, 'initial')}</>
  }

  expect(renderToString(<ObservableComponent />)).toBe('initial')
})

test('SSR with an initialValue never subscribes the source', () => {
  // There is no commit phase on the server, and with an initialValue no warm-up either —
  // subscribe-time side effects never run during server rendering.
  let subscriptions = 0
  const source = defer(() => {
    subscriptions++
    return of('sync')
  })
  function ObservableComponent() {
    return <>{useObservable(source, 'server value')}</>
  }

  expect(renderToString(<ObservableComponent />)).toBe('server value')
  expect(subscriptions).toBe(0)
})

test('SSR with an async observable renders the resolved initialValue', () => {
  const observable = scheduled('async value', asyncScheduler)
  function ObservableComponent() {
    return <>{useObservable(observable, 'initial value')}</>
  }

  expect(renderToString(<ObservableComponent />)).toBe('initial value')
})

test('SSR without an initialValue no longer throws', () => {
  // Contrast with useSyncObservable, which still throws without getServerSnapshot.
  expect(renderToString(<SSRSyncEmit />)).toBe('sync')
  // Empty output matches the client's first paint (undefined).
  expect(renderToString(<SSRAsyncNoInitial />)).toBe('')
})

function SSRSyncEmit() {
  return <>{useObservable(of('sync'))}</>
}

function SSRAsyncNoInitial() {
  return <>{useObservable(scheduled('async', asyncScheduler))}</>
}

test('SSR surfaces synchronous observable errors when no initialValue is given', () => {
  // Without an initialValue the warm-up captures the error during the server render, and the
  // snapshot-based getServerSnapshot fails the server render with the observable's error.
  const observable = throwError(() => new Error('boom'))
  function ObservableComponent() {
    return <>{useObservable(observable)}</>
  }

  expect(() => renderToString(<ObservableComponent />)).toThrow('boom')
})

test('SSR with an initialValue renders it and leaves a synchronous error to the client subscription', () => {
  // With an initialValue there is no render-phase warm-up, so nothing can throw on the
  // server: it paints the initialValue, and the error surfaces on the client once the store
  // subscription starts after mount.
  const observable = throwError(() => new Error('boom'))
  function ObservableComponent() {
    return <>{useObservable(observable, 'initial')}</>
  }

  expect(renderToString(<ObservableComponent />)).toBe('initial')
})

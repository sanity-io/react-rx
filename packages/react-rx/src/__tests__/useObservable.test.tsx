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

  const {unmount} = renderHook(() => useObservable(observable, undefined))
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

  const {unmount, rerender} = renderHook(() => useObservable(observable, undefined))
  expect(subscriptionCount).toBe(1)
  rerender()
  expect(subscriptionCount).toBe(1)
  unmount()
  await Promise.resolve()

  renderHook(() => useObservable(observable, undefined))
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

test('a sync emission replaces an explicit undefined initialValue right after mount', () => {
  // The observable is never subscribed during render: the first render shows the (undefined)
  // initialValue, and the store subscription on commit delivers the sync emission before
  // renderHook returns.
  const observable = of('something sync')
  const {result} = renderHook(() => useObservable(observable, undefined))
  expect(result.current).toBe('something sync')
})

test('should have undefined as initial value from delayed observables', () => {
  const {result, unmount} = renderHook(() =>
    useObservable(scheduled('something async', asyncScheduler), undefined),
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
  const firstHook = renderHook(() => useObservable(observable, undefined))
  expect(firstHook.result.current).toBe(0)
  const secondHook = renderHook(() => useObservable(observable, undefined))
  expect(secondHook.result.current).toBe(0)
  firstHook.unmount()
  secondHook.unmount()
  await Promise.resolve()

  const thirdHook = renderHook(() => useObservable(observable, undefined))
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

  const secondHook = renderHook(() => useObservable(observable, undefined))
  expect(secondHook.result.current).toBe(undefined)
  expect(subscribeCount).toBe(2)
  expect(unsubscribeCount).toBe(1)
  secondHook.unmount()
  await Promise.resolve()

  expect(unsubscribeCount).toBe(2)
})

test('should update with values from observables', () => {
  const values$ = new Subject<string>()
  const {result, unmount} = renderHook(() => useObservable(values$, undefined))

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

  // The switch render never subscribes subjectB — it falls back to the initialValue, never the
  // deferred snapshot belonging to the previous observable. subjectB's synchronous emission
  // arrives right after the commit and settles the timeline.
  expect(renderTimeline[timelineLengthBeforeSwitch]).toBe('fallback')
  expect(renderTimeline.slice(timelineLengthBeforeSwitch)).not.toContain('value for a')
  expect(renderTimeline.at(-1)).toBe('initial for b')

  act(() => subjectB.next('updated for b'))
  expect(renderTimeline.at(-1)).toBe('updated for b')

  unmount()
})

test('identity change to a sync-emitting observable: the initialValue renders for the switch pass, the emission lands after its commit', () => {
  const subjectA = new BehaviorSubject('value for a')
  const subjectB = new BehaviorSubject('initial for b')
  const renderTimeline: (string | undefined)[] = []

  function ObservableComponent({observable}: {observable: BehaviorSubject<string>}) {
    renderTimeline.push(useObservable(observable, undefined))
    return null
  }
  const {rerender, unmount} = render(<ObservableComponent observable={subjectA} />)
  expect(renderTimeline.at(-1)).toBe('value for a')

  const timelineLengthBeforeSwitch = renderTimeline.length
  rerender(<ObservableComponent observable={subjectB} />)

  // The replacement is not subscribed during render either, so the switch pass shows the
  // (undefined) initialValue; the commit-time subscription then delivers subjectB's synchronous
  // emission. The previous observable's value never renders under the new identity.
  expect(renderTimeline[timelineLengthBeforeSwitch]).toBeUndefined()
  expect(renderTimeline.slice(timelineLengthBeforeSwitch)).not.toContain('value for a')
  expect(renderTimeline.at(-1)).toBe('initial for b')

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

test('the observable is never subscribed during render: the initialValue paints first, the sync emission follows after mount', () => {
  // The source is first subscribed by the live store subscription on commit, keeping
  // subscribe-time side effects out of the render phase.
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

test('disabled never subscribes the source (zero subscriptions)', () => {
  // Nothing subscribes during render, and `disabled` pauses the store subscription — so nothing
  // ever subscribes the source.
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

test('a consumer that swaps to an observable already live elsewhere reads its last emission on the swap render', () => {
  // `Keeper` holds a live subscription to `source`, so the shared cache entry has emitted.
  // When `Swapper` swaps identities to `source`, its swap render reads the entry's last
  // emission straight from the cache — no subscription during render, and no initialValue
  // flash for observables that are already live.
  const subject = new BehaviorSubject('first value')
  const source = new BehaviorSubject('sync')
  const swapper: unknown[] = []
  function Keeper() {
    useObservable(source, 'keeper initial')
    return null
  }
  function Swapper({observable}: {observable: Observable<string>}) {
    swapper.push(useObservable(observable, 'swapper initial'))
    return null
  }
  const {rerender} = render(
    <>
      <Keeper />
      <Swapper observable={subject} />
    </>,
  )
  expect(swapper.at(-1)).toBe('first value')

  const swapIndex = swapper.length
  rerender(
    <>
      <Keeper />
      <Swapper observable={source} />
    </>,
  )
  expect(swapper[swapIndex]).toBe('sync')
  expect(swapper.slice(swapIndex)).not.toContain('swapper initial')
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

test('initialValue factories must be pure', () => {
  const values$ = new Subject<string>()
  let factoryCalls = 0
  const factory = () => {
    factoryCalls++
    return 'initial'
  }

  const {result} = renderHook(() => useObservable(values$, factory))
  // Pre-emission: uSES calls getSnapshot (factory included) during render and again
  // when checking for tearing on commit.
  expect(factoryCalls).toBeGreaterThanOrEqual(2)
  expect(result.current).toBe('initial')
  const callsBeforeEmit = factoryCalls

  act(() => values$.next('emitted'))
  expect(result.current).toBe('emitted')
  // After didEmit, getSnapshot short-circuits and the factory is no longer called.
  expect(factoryCalls).toBe(callsBeforeEmit)
})

test('SSR renders the initialValue even when the observable emits synchronously', () => {
  // The observable is never subscribed during render, so the server never sees the sync
  // emission: it paints the resolved initialValue — exactly what the client's first paint
  // will show.
  const observable = of('server-sync')
  function ObservableComponent() {
    return <>{useObservable(observable, 'initial')}</>
  }

  expect(renderToString(<ObservableComponent />)).toBe('initial')
})

test('SSR never subscribes the source', () => {
  // There is no commit phase on the server and no subscription during render — subscribe-time
  // side effects never run during server rendering.
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

test('SSR with an explicit undefined initialValue renders nothing and never subscribes', () => {
  // The server never subscribes the observable — even a synchronous emission is not picked up.
  // Empty output matches the client's first paint (the undefined initialValue).
  let subscriptions = 0
  const source = defer(() => {
    subscriptions++
    return of('sync')
  })
  function SSRSyncEmit() {
    return <>{useObservable(source, undefined)}</>
  }

  expect(renderToString(<SSRSyncEmit />)).toBe('')
  expect(subscriptions).toBe(0)
  expect(renderToString(<SSRAsyncUndefined />)).toBe('')
})

function SSRAsyncUndefined() {
  return <>{useObservable(scheduled('async', asyncScheduler), undefined)}</>
}

test('SSR renders the initialValue and leaves a synchronous error to the client subscription', () => {
  // The observable is never subscribed during server rendering, so nothing can throw on the
  // server: it paints the initialValue, and the error surfaces on the client once the store
  // subscription starts after mount.
  const observable = throwError(() => new Error('boom'))
  function ObservableComponent() {
    return <>{useObservable(observable, 'initial')}</>
  }

  expect(renderToString(<ObservableComponent />)).toBe('initial')
})

import {act, render, renderHook} from '@testing-library/react'
import {useMemo} from 'react'
import {renderToString} from 'react-dom/server'
import {
  asyncScheduler,
  defer,
  map,
  Observable,
  of,
  ReplaySubject,
  scheduled,
  share,
  Subject,
  timer,
} from 'rxjs'
import {expect, test} from 'vitest'

import type {UseObservableOptions} from '../types'
import {useSyncObservable} from '../useSyncObservable'

test('should subscribe immediately on component mount and unsubscribe on component unmount', async () => {
  let subscribed = false
  const observable = new Observable(() => {
    subscribed = true
    return () => {
      subscribed = false
    }
  })

  expect(subscribed).toBe(false)

  const {unmount} = renderHook(() => useSyncObservable(observable))
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

  const {unmount, rerender} = renderHook(() => useSyncObservable(observable))
  expect(subscriptionCount).toBe(1)
  rerender()
  expect(subscriptionCount).toBe(1)
  unmount()
  await Promise.resolve()

  renderHook(() => useSyncObservable(observable))
  expect(subscriptionCount).toBe(2)
})

test('should not return undefined during render if initial value is given', () => {
  const observable = timer(100).pipe(map(() => 'emitted value'))

  const returnedValues: unknown[] = []
  function ObservableComponent() {
    const observedValue = useSyncObservable(observable, 'initial value')
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
    const observedValue = useSyncObservable(observable)
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
    const observedValue = useSyncObservable(observable)
    returnedValues.push(observedValue)
    return <>{observedValue}</>
  }
  render(<ObservableComponent />)
  expect(returnedValues).toEqual(expect.arrayContaining([undefined]))
})

test('should have sync values from an observable as initial value', () => {
  const observable = of('something sync')
  const {result} = renderHook(() => useSyncObservable(observable))
  expect(result.current).toBe('something sync')
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
    const value = useSyncObservable(source, 'initial')
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
  const {result, unmount} = renderHook(() => useSyncObservable(source, 'initial', {disabled: true}))
  expect(result.current).toBe('initial')
  expect(subscriptions).toBe(0)
  unmount()
})

test('should have undefined as initial value from delayed observables', () => {
  const {result, unmount} = renderHook(() =>
    useSyncObservable(scheduled('something async', asyncScheduler)),
  )
  expect(result.current).toBeUndefined()
  unmount()
})

test('should have passed initialValue as initial value from delayed observables', () => {
  const {result, unmount} = renderHook(() =>
    useSyncObservable(scheduled('something async', asyncScheduler), 'initial'),
  )
  expect(result.current).toBe('initial')
  unmount()
})

test('should rerender with initial value if component unmounts and then remounts', async () => {
  const values$ = new Subject<string>()
  const firstHook = renderHook(() => useSyncObservable(values$, 'initial'))

  expect(firstHook.result.current).toBe('initial')

  act(() => values$.next('something'))
  expect(firstHook.result.current).toBe('something')

  firstHook.unmount()
  await Promise.resolve()

  const nextHook = renderHook(() => useSyncObservable(values$, 'initial2'))

  expect(nextHook.result.current).toBe('initial2')
})

test('should share the observable between each concurrent subscribing hook', async () => {
  let subscribeCount = 0
  const observable = new Observable<number>((subscriber) => {
    subscriber.next(subscribeCount++)
  })
  const firstHook = renderHook(() => useSyncObservable(observable))
  expect(firstHook.result.current).toBe(0)
  const secondHook = renderHook(() => useSyncObservable(observable))
  expect(secondHook.result.current).toBe(0)
  firstHook.unmount()
  secondHook.unmount()
  await Promise.resolve()

  const thirdHook = renderHook(() => useSyncObservable(observable))
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

  const firstHook = renderHook(() => useSyncObservable(observable, 'initial'))
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

  const secondHook = renderHook(() => useSyncObservable(observable))
  expect(secondHook.result.current).toBe(undefined)
  expect(subscribeCount).toBe(2)
  expect(unsubscribeCount).toBe(1)
  secondHook.unmount()
  await Promise.resolve()

  expect(unsubscribeCount).toBe(2)
})

test('should update with values from observables', () => {
  const values$ = new Subject<string>()
  const {result, unmount} = renderHook(() => useSyncObservable(values$))

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

  const {result, rerender, unmount} = renderHook(() => useSyncObservable(current$, '!!initial!!'))

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

test('should return undefined if observable emits undefined, also when given initial value', () => {
  const values$ = new Subject<string | undefined>()
  const {result, unmount} = renderHook(() => useSyncObservable(values$, 'initial'))

  expect(result.current).toBe('initial')

  act(() => values$.next(undefined))

  expect(result.current).toBe(undefined)

  unmount()
})

test('should return undefined if observable emits undefined, also when given initial value, and also when unsubscribe + resubscribe', () => {
  const snapshots: (string | undefined)[] = []
  const subject = new Subject<string | undefined>()

  function ObservableComponent(props: {prefix: string}) {
    // will create a new observable every time prefix changes
    const observable = useMemo(
      () => subject.pipe(map((v) => (typeof v === 'string' ? `${props.prefix}-${v}` : v))),
      [props.prefix],
    )
    snapshots.push(useSyncObservable(observable, 'initial'))
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
  expect(snapshots).toEqual([
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

test('should support SSR if an initial value is given', () => {
  const observable = scheduled('async value', asyncScheduler)
  function ObservableComponent() {
    const observedValue = useSyncObservable(observable, 'initial value')
    return <>{observedValue}</>
  }

  expect(renderToString(<ObservableComponent />)).toBe('initial value')
})

test('should throw during SSR if no initial value is defined', () => {
  const observable = scheduled('async value', asyncScheduler)
  function ObservableComponent() {
    const observedValue = useSyncObservable(observable)
    return <>{observedValue}</>
  }

  expect(() => renderToString(<ObservableComponent />)).toThrowErrorMatchingInlineSnapshot(
    `[Error: Missing getServerSnapshot, which is required for server-rendered content. Will revert to client rendering.]`,
  )
})

test('SSR renders the initialValue even when the observable emits synchronously', () => {
  // Neither hook subscribes during render when an initialValue is given, so both paint the
  // initialValue on the server. The remaining contrast with `useObservable` is the strict v4
  // contract: `useSyncObservable` throws without an initialValue, `useObservable` does not.
  const observable = of('sync')
  function ObservableComponent() {
    const observedValue = useSyncObservable(observable, 'initial')
    return <>{observedValue}</>
  }

  expect(renderToString(<ObservableComponent />)).toBe('initial')
})

test('should not receive updates while disabled', () => {
  const values$ = new Subject<string | undefined>()
  const {result, unmount} = renderHook(() =>
    useSyncObservable(values$, 'initial', {disabled: true}),
  )

  act(() => values$.next('something'))
  expect(result.current).toBe('initial')

  unmount()
})

test('should return the last value instead of the initial value when the hook is disabled after running', () => {
  const values$ = new Subject<string | undefined>()
  const {result, unmount, rerender} = renderHook<string | undefined, UseObservableOptions>(
    (props) => useSyncObservable(values$, 'initial', props),
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
    (props) => useSyncObservable(values$, 'initial', props),
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

test('initialValue factories must be pure', () => {
  const values$ = new Subject<string>()
  let factoryCalls = 0
  const factory = () => {
    factoryCalls++
    return 'initial'
  }

  const {result} = renderHook(() => useSyncObservable(values$, factory))
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

test('SSR resolves a factory initialValue through getServerSnapshot', () => {
  // The sync hook's getServerSnapshot resolves factories via getValue — a code path
  // distinct from the client getSnapshot.
  const observable = scheduled('async value', asyncScheduler)
  function ObservableComponent() {
    return <>{useSyncObservable(observable, () => 'factory initial')}</>
  }

  expect(renderToString(<ObservableComponent />)).toBe('factory initial')
})

import {act, render, renderHook} from '@testing-library/react'
import {createElement, Fragment} from 'react'
import {asyncScheduler, Observable, of, ReplaySubject, scheduled, share, Subject, timer} from 'rxjs'
import {map} from 'rxjs/operators'
import {expect, test} from 'vitest'

import {useObservable} from '../useObservable'

test('should subscribe immediately on component mount and unsubscribe on component unmount', () => {
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
  expect(subscribed).toBe(false)
})

test('should only subscribe once when given same observable on re-renders', () => {
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

  renderHook(() => useObservable(observable))
  expect(subscriptionCount).toBe(2)
})

test('should not return undefined during render if initial value is given', () => {
  const observable = timer(100).pipe(map(() => 'emitted value'))

  const returnedValues: unknown[] = []
  function ObservableComponent() {
    const observedValue = useObservable(observable, 'initial value')
    returnedValues.push(observedValue)
    return createElement(Fragment, null, observedValue)
  }
  render(createElement(ObservableComponent))
  expect(returnedValues).toEqual(expect.arrayContaining(['initial value']))
})

test('should not return undefined during render if observable is sync', () => {
  const observable = of('initial value')

  const returnedValues: unknown[] = []
  function ObservableComponent() {
    const observedValue = useObservable(observable)
    returnedValues.push(observedValue)
    return createElement(Fragment, null, observedValue)
  }
  render(createElement(ObservableComponent))
  expect(returnedValues).toEqual(expect.arrayContaining(['initial value']))
})

test('should return undefined during first render if observable is async', () => {
  const observable = scheduled('async value', asyncScheduler)

  const returnedValues: unknown[] = []
  function ObservableComponent() {
    const observedValue = useObservable(observable)
    returnedValues.push(observedValue)
    return createElement(Fragment, null, observedValue)
  }
  render(createElement(ObservableComponent))
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

test('should rerender with initial value if component unmounts and then remounts', () => {
  const values$ = new Subject<string>()
  const firstHook = renderHook(() => useObservable(values$, 'initial'))

  expect(firstHook.result.current).toBe('initial')

  act(() => values$.next('something'))
  expect(firstHook.result.current).toBe('something')

  firstHook.unmount()

  const nextHook = renderHook(() => useObservable(values$, 'initial2'))

  expect(nextHook.result.current).toBe('initial2')
})

test('should share the observable between each concurrent subscribing hook', () => {
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

  const thirdHook = renderHook(() => useObservable(observable))
  expect(thirdHook.result.current).toBe(1)
  thirdHook.unmount()
})

test('should restart any completed observable on mount', () => {
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

  const secondHook = renderHook(() => useObservable(observable))
  expect(secondHook.result.current).toBe(undefined)
  expect(subscribeCount).toBe(2)
  expect(unsubscribeCount).toBe(1)
  secondHook.unmount()
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

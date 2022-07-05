import {act, render, renderHook} from '@testing-library/react'
import {useObservable} from '../useObservable'
import {asyncScheduler, Observable, of, scheduled, Subject, timer} from 'rxjs'
import {mapTo} from 'rxjs/operators'
import {createElement, Fragment} from 'react'

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
  const observable = timer(100).pipe(mapTo('emitted value'))

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

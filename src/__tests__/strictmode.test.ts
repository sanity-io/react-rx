import {BehaviorSubject, Observable, of} from 'rxjs'
import {useObservable} from '../useObservable'
import {createElement, Fragment, StrictMode, useEffect} from 'react'
import {act, render} from '@testing-library/react'
import {useAsObservable} from '../useAsObservable'

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// NOTE: Jest runs NODE_ENV=test by default, which enables development flags for React

test('Strict mode should trigger double mount effects and re-renders', async () => {
  const subject = new BehaviorSubject(0)
  const observable = subject.asObservable()

  const returnedValues: unknown[] = []
  let mountCount = 0
  function ObservableComponent() {
    useEffect(() => {
      mountCount++
    }, [])
    const observedValue = useObservable(observable)
    returnedValues.push(observedValue)
    return createElement(Fragment, null, observedValue)
  }

  const {rerender} = render(createElement(StrictMode, null, createElement(ObservableComponent)))
  expect(mountCount).toEqual(2)

  expect(returnedValues).toEqual([0, 0])

  await wait(10)
  act(() => subject.next(1))
  expect(returnedValues).toEqual([0, 0, 1, 1])

  act(() => subject.next(2))
  expect(returnedValues).toEqual([0, 0, 1, 1, 2, 2])

  expect(mountCount).toEqual(2)
})

test('Strict mode should unsubscribe the source observable on unmount', () => {
  let subscribed = false
  const observable = new Observable(() => {
    subscribed = true
    return () => {
      subscribed = false
    }
  })

  function ObservableComponent() {
    useObservable(observable)
    return createElement(Fragment, null)
  }

  const {rerender} = render(createElement(StrictMode, null, createElement(ObservableComponent)))
  expect(subscribed).toBe(true)
  rerender(createElement(StrictMode, null, createElement('div')))
  expect(subscribed).toBe(false)
})

test('useAsObservable should work in strict mode', async () => {
  const returnedValues: unknown[] = []
  function ObservableComponent(props: {count: number}) {
    const count$ = useAsObservable(props.count)
    const count = useObservable(count$)
    returnedValues.push(count)
    return createElement(Fragment, null, 'ok')
  }

  const {rerender} = render(
    createElement(StrictMode, null, createElement(ObservableComponent, {count: 0})),
  )

  expect(returnedValues).toEqual([0, 0])

  rerender(createElement(StrictMode, null, createElement(ObservableComponent, {count: 1})))

  expect(returnedValues).toEqual([0, 0, 0, 0, 1, 1])
})

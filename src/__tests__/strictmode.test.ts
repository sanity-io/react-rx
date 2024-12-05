import {act, render} from '@testing-library/react'
import {createElement, Fragment, StrictMode, useEffect, useMemo} from 'react'
import {BehaviorSubject, Observable} from 'rxjs'
import {expect, test} from 'vitest'

import {useObservable} from '../useObservable'

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

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

  render(createElement(StrictMode, null, createElement(ObservableComponent)))
  expect(mountCount).toEqual(2)

  expect(returnedValues).toEqual([0, 0])

  await wait(10)
  act(() => subject.next(1))
  expect(returnedValues).toEqual([0, 0, 1, 1])

  act(() => subject.next(2))
  expect(returnedValues).toEqual([0, 0, 1, 1, 2, 2])

  expect(mountCount).toEqual(2)
})

test('Strict mode should unsubscribe the source observable on unmount', async () => {
  const subscribed: number[] = []
  const unsubscribed: number[] = []
  let nextId = 0
  const observable = new Observable(() => {
    const id = nextId++
    subscribed.push(id)
    return () => {
      unsubscribed.push(id)
    }
  })

  function ObservableComponent() {
    useObservable(observable)
    return createElement(Fragment, null)
  }

  const {rerender} = render(createElement(StrictMode, null, createElement(ObservableComponent)))
  expect(subscribed).toEqual([0])
  rerender(createElement(StrictMode, null, createElement('div')))
  await Promise.resolve()
  expect(unsubscribed).toEqual([0])
})

test('Strict mode should unsubscribe the source observable on unmount if its created in a useMemo', async () => {
  let subscriberCount: number = 0
  const getObservable = () =>
    new Observable(() => {
      subscriberCount++
      return () => {
        subscriberCount--
      }
    })

  function ObservableComponent() {
    const memoObservable = useMemo(() => getObservable(), [])
    useObservable(memoObservable)
    return createElement(Fragment, null)
  }

  const {rerender} = render(createElement(StrictMode, null, createElement(ObservableComponent)))
  expect(subscriberCount, 'Subscriber count should be 1').toBe(1)
  rerender(createElement(StrictMode, null, createElement('div')))
  await Promise.resolve()
  expect(subscriberCount, 'Subscriber count should be 0').toBe(0)
})

import {BehaviorSubject, Observable, of} from 'rxjs'
import {useMemoObservable, useObservable} from '../useObservable'
import {createElement, Fragment, StrictMode, useEffect} from 'react'
import {act, render} from '@testing-library/react'
import {useAsObservable} from '../useAsObservable'
import {test, expect} from 'vitest'

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
  expect(subscribed).toEqual([0, 1])
  rerender(createElement(StrictMode, null, createElement('div')))
  expect(unsubscribed).toEqual([0, 1])
})

test('useMemoObservable should unsubscribe the source observable on unmount', () => {
  const subscribed: number[] = []
  const unsubscribed: number[] = []
  let nextId = 0
  function ObservableComponent() {
    useMemoObservable(() => {
      return new Observable(() => {
        const id = nextId++
        subscribed.push(id)
        return () => {
          unsubscribed.push(id)
        }
      })
    }, [])
    return createElement(Fragment, null)
  }

  const {rerender} = render(createElement(StrictMode, null, createElement(ObservableComponent)))
  expect(subscribed).toEqual([0, 1, 2])
  rerender(createElement(StrictMode, null, createElement('div')))
  expect(unsubscribed).toEqual([0, 1, 2])
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

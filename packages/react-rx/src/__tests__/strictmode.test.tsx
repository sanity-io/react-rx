import {act, render} from '@testing-library/react'
import {useEffect, useMemo} from 'react'
import {BehaviorSubject, Observable, Subject} from 'rxjs'
import {describe, expect, test} from 'vitest'

import {useObservable} from '../useObservable'
import {useSyncObservable} from '../useSyncObservable'

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const hooks = [
  {name: 'useSyncObservable', useHook: useSyncObservable},
  {name: 'useObservable', useHook: useObservable},
] as const

describe.each(hooks)('$name', ({useHook}) => {
  test('Strict mode should trigger double mount effects and re-renders', async () => {
    const subject = new BehaviorSubject(0)
    const observable = subject.asObservable()

    const returnedValues: unknown[] = []
    let mountCount = 0
    function ObservableComponent() {
      useEffect(() => {
        // oxlint-disable-next-line react/todo -- compiler cannot yet lower ++ captured in lambdas
        mountCount++
      }, [])
      const observedValue = useHook(observable)
      returnedValues.push(observedValue)
      return <>{observedValue}</>
    }

    render(<ObservableComponent />, {reactStrictMode: true})
    expect(mountCount).toEqual(2)

    // useObservable may schedule an Object.is bail-out deferred pass on mount
    // (useDeferredValue second arg is defined), so mount can produce more than two
    // Strict Mode renders — all must still be the sync BehaviorSubject value.
    expect(returnedValues.length).toBeGreaterThanOrEqual(2)
    expect(returnedValues.every((v) => v === 0)).toBe(true)
    const afterMount = returnedValues.length

    await wait(10)
    act(() => subject.next(1))
    expect(returnedValues.slice(afterMount).at(-1)).toBe(1)
    expect(returnedValues.slice(afterMount)).toContain(1)

    const afterOne = returnedValues.length
    act(() => subject.next(2))
    expect(returnedValues.slice(afterOne).at(-1)).toBe(2)
    expect(returnedValues.slice(afterOne)).toContain(2)

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
      useHook(observable, undefined)
      return null
    }

    const {unmount} = render(<ObservableComponent />, {reactStrictMode: true})
    expect(subscribed).toEqual([0])
    unmount()
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
      useHook(memoObservable, undefined)
      return null
    }

    const {unmount} = render(<ObservableComponent />, {reactStrictMode: true})
    expect(subscriberCount, 'Subscriber count should be 1').toBe(1)
    unmount()
    await Promise.resolve()
    expect(subscriberCount, 'Subscriber count should be 0').toBe(0)
  })

  test('Strict mode double-invokes a fresh-object initializer but keeps one resolved reference', () => {
    const values$ = new Subject<{label: string}>()
    let initializerCalls = 0
    const rendered: {label: string}[] = []

    function ObservableComponent() {
      const value = useHook(values$, () => {
        // oxlint-disable-next-line react/todo -- compiler cannot yet lower ++ captured in lambdas
        initializerCalls++
        return {label: 'initial'}
      })
      rendered.push(value)
      return null
    }

    const {rerender} = render(<ObservableComponent />, {reactStrictMode: true})
    expect(initializerCalls, 'Strict Mode calls useState initializers twice in development').toBe(2)
    expect(new Set(rendered).size, 'every pre-emission render saw the same reference').toBe(1)

    rerender(<ObservableComponent />)
    expect(initializerCalls).toBe(2)
    expect(new Set(rendered).size).toBe(1)

    act(() => values$.next({label: 'emitted'}))
    expect(rendered.at(-1)).toEqual({label: 'emitted'})
  })
})

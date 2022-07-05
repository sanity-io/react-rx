import {useAsObservable} from '../useAsObservable'
import React from 'react'
import {renderHook} from '@testing-library/react'
import {Observable} from 'rxjs'

test('the returned observable should receive a new value when component is rendered with a new value', () => {
  const receivedValues: string[] = []
  const {unmount, rerender} = renderHook(
    (props: {value: string}) => {
      const observable = useAsObservable(props.value)

      React.useEffect(() => {
        const subscription = observable.subscribe(v => {
          receivedValues.push(v)
        })
        return () => {
          subscription.unsubscribe()
        }
      }, [])
    },
    {initialProps: {value: 'initial'}},
  )

  rerender({value: 'rerender'})
  rerender({value: 'rerender again'})

  expect(receivedValues).toEqual(['initial', 'rerender', 'rerender again'])

  unmount()
})

test('the returned observable should *not* receive a new value when component is rendered with an unchanged value', () => {
  const receivedValues: string[] = []
  const {unmount, rerender} = renderHook(
    (props: {value: string}) => {
      const observable = useAsObservable(props.value)

      React.useEffect(() => {
        const subscription = observable.subscribe(v => {
          receivedValues.push(v)
        })
        return () => {
          subscription.unsubscribe()
        }
      }, [])
    },
    {initialProps: {value: 'some value'}},
  )

  rerender({value: 'some value'})
  rerender({value: 'some value'})

  expect(receivedValues).toEqual(['some value'])

  unmount()
})

test('the returned observable should have the same identity across multiple re-renders/hook calls', () => {
  const returnValues: Observable<unknown>[] = []
  const {unmount, rerender} = renderHook(() => {
    returnValues.push(useAsObservable('render'))
  })

  rerender()
  rerender()

  const [initial, firstRerender, secondRerender] = returnValues
  expect(initial).toBe(firstRerender)
  expect(firstRerender).toBe(secondRerender)
  unmount()
})

test('the returned observable should complete on unmount', () => {
  let didComplete = false
  const {unmount, rerender} = renderHook(() => {
    const observable = useAsObservable('render')

    React.useEffect(() => {
      const subscription = observable.subscribe({
        complete: () => {
          didComplete = true
        },
      })
      return () => {
        subscription.unsubscribe()
      }
    }, [])
  })
  expect(didComplete).toBe(false)
  rerender()
  expect(didComplete).toBe(false)
  unmount()
  expect(didComplete).toBe(true)
})

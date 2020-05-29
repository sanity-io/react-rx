import {render, screen, waitFor} from '@testing-library/react'
import {toObservable, useObservable} from '../useObservable'
import React from 'react'

function TestObservableProp(props: {value: string}) {
  return <div data-testid="output">{useObservable(toObservable(props.value))}</div>
}

function useDelayedValue<T>(ms: number, initialValue: T, delayedValue: T) {
  const [value, setValue] = React.useState(initialValue)
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setValue(delayedValue)
    }, ms)
    return () => {
      clearTimeout(timer)
    }
  }, [ms])
  return value
}

test('toObservable on passed prop', () => {
  const result = render(<TestObservableProp value="hello" />)
  expect(result.queryByTestId('output')?.innerHTML).toBe('hello')
})

function TestObservableHookValue() {
  const value$ = toObservable(useDelayedValue(100, 'initial', 'delayed'))
  return <div data-testid="output">{useObservable(value$)}</div>
}

test('toObservable on value returned from a hook', async () => {
  render(<TestObservableHookValue />)
  expect(screen.queryByTestId('output')?.innerHTML).toBe('initial')
  await waitFor(() => expect(screen.queryByTestId('output')?.innerHTML).toBe('delayed'))
})

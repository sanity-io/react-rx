import {act, fireEvent, render, screen} from '@testing-library/react'
import {StrictMode} from 'react'
import {afterEach, expect, test, vi} from 'vitest'

import BasicState from '../../../../website/src/examples/basic-state/App'
import Clicks from '../../../../website/src/examples/simple/App'

afterEach(() => vi.useRealTimers())

test('manual and react-rx counters work independently and flow control drops clicks', async () => {
  vi.useFakeTimers()
  render(
    <StrictMode>
      <Clicks />
    </StrictMode>,
  )

  const manual = screen.getByRole('button', {name: 'React + RxJS: 0 clicks'})
  const reactive = screen.getByRole('button', {name: 'react-rx: 0 clicks'})
  await act(async () => {
    fireEvent.click(manual)
    fireEvent.click(manual)
    fireEvent.click(manual)
    fireEvent.click(reactive)
  })
  expect(manual.textContent).toBe('React + RxJS: 3 clicks')
  expect(reactive.textContent).toBe('react-rx: 1 clicks')

  const flow = screen.getByRole('button', {name: 'Click quickly'})
  await act(async () => {
    for (let index = 0; index < 5; index += 1) fireEvent.click(flow)
  })
  expect(screen.getByText('Throttled to 1/sec: 1')).toBeTruthy()
  expect(screen.getByText('Mapped to parity: odd')).toBeTruthy()
  await act(() => vi.advanceTimersByTimeAsync(1000))
  await act(async () => fireEvent.click(flow))
  expect(screen.getByText('Throttled to 1/sec: 2')).toBeTruthy()
  expect(screen.getByText('Mapped to parity: even')).toBeTruthy()
})

test('string, boolean, and two-field examples keep their values independent', async () => {
  render(
    <StrictMode>
      <BasicState />
    </StrictMode>,
  )
  await act(async () => {
    fireEvent.change(screen.getByLabelText('Your name'), {target: {value: 'Ada'}})
    fireEvent.click(screen.getByLabelText('Send me updates'))
    fireEvent.change(screen.getByLabelText('First name'), {target: {value: 'Grace'}})
    fireEvent.change(screen.getByLabelText('Last name'), {target: {value: 'Hopper'}})
  })
  expect(screen.getByText('Hello, Ada.')).toBeTruthy()
  expect(screen.getByText('You are subscribed.')).toBeTruthy()
  expect(screen.getByText('Full name: Grace Hopper')).toBeTruthy()

  await act(async () => {
    fireEvent.change(screen.getByLabelText('First name'), {target: {value: 'A.'}})
    fireEvent.change(screen.getByLabelText('Your name'), {target: {value: ''}})
  })
  expect(screen.getByText('Full name: A. Hopper')).toBeTruthy()
  expect(screen.getByText('Hello, stranger.')).toBeTruthy()
  expect((screen.getByLabelText('Send me updates') as HTMLInputElement).checked).toBe(true)
})

import {act, fireEvent, render, renderHook, screen} from '@testing-library/react'
import {StrictMode, useEffect, useMemo, type ChangeEvent} from 'react'
import {map, Observable, scan, Subject, tap} from 'rxjs'
import {expect, test, vi} from 'vitest'

import {useObservableSubject} from '../useObservableSubject'
import {useSyncObservable} from '../useSyncObservable'

test('the observable emits handled events in call order', () => {
  const {result} = renderHook(() => useObservableSubject<number>())
  const seen: number[] = []
  result.current[0].subscribe((value) => seen.push(value))

  act(() => {
    result.current[1](1)
    result.current[1](2)
    result.current[1](3)
  })

  expect(seen).toEqual([1, 2, 3])
})

test('events emitted while nothing is subscribed are dropped, like a Subject', () => {
  const {result} = renderHook(() => useObservableSubject<string>())
  act(() => result.current[1]('before'))

  const seen: string[] = []
  result.current[0].subscribe((value) => seen.push(value))
  act(() => result.current[1]('after'))

  expect(seen).toEqual(['after'])
})

test('the tuple, observable, and handler remain stable across re-renders', () => {
  const {result, rerender} = renderHook(() => useObservableSubject<string>())
  const first = result.current

  rerender()
  rerender()

  expect(result.current).toBe(first)
  expect(result.current[0]).toBe(first[0])
  expect(result.current[1]).toBe(first[1])
})

test('only the observable side of the Subject is exposed', () => {
  const {result} = renderHook(() => useObservableSubject<string>())
  const events$ = result.current[0]

  expect(events$).toBeInstanceOf(Observable)
  expect(events$).not.toBeInstanceOf(Subject)
  expect('next' in events$).toBe(false)
})

function TextInput() {
  const [changes$, handleChange] = useObservableSubject<ChangeEvent<HTMLInputElement>>()
  const text$ = useMemo(() => changes$.pipe(map((event) => event.currentTarget.value)), [changes$])
  const text = useSyncObservable(text$, '')

  return <input aria-label="text" value={text} onChange={handleChange} />
}

test('the handler can be passed directly to a React event prop', () => {
  render(<TextInput />)

  fireEvent.change(screen.getByRole('textbox', {name: 'text'}), {target: {value: 'hello'}})

  expect(screen.getByRole<HTMLInputElement>('textbox', {name: 'text'}).value).toBe('hello')
})

test('the observable can drive derived state', () => {
  const {result} = renderHook(() => {
    const [values$, handleValue] = useObservableSubject<number>()
    const total$ = useMemo(() => values$.pipe(scan((total, value) => total + value, 0)), [values$])
    return [useSyncObservable(total$, 0), handleValue] as const
  })

  expect(result.current[0]).toBe(0)
  act(() => result.current[1](2))
  act(() => result.current[1](3))
  expect(result.current[0]).toBe(5)
})

function SideEffect({effect}: {effect: (value: string) => void}) {
  const [events$, handleEvent] = useObservableSubject<string>()

  useEffect(() => {
    const subscription = events$.pipe(tap(effect)).subscribe()
    return () => subscription.unsubscribe()
  }, [effect, events$])

  return (
    <button type="button" onClick={() => handleEvent('event')}>
      fire
    </button>
  )
}

test('under StrictMode an event runs an effect pipeline exactly once', () => {
  const effect = vi.fn()
  render(
    <StrictMode>
      <SideEffect effect={effect} />
    </StrictMode>,
  )

  fireEvent.click(screen.getByRole('button', {name: 'fire'}))

  expect(effect.mock.calls).toEqual([['event']])
})

test('effect cleanup stops the pipeline from receiving later events', () => {
  const effect = vi.fn()
  const {result, unmount} = renderHook(() => {
    const [events$, handleEvent] = useObservableSubject<string>()
    useEffect(() => {
      const subscription = events$.pipe(tap(effect)).subscribe()
      return () => subscription.unsubscribe()
    }, [events$])
    return handleEvent
  })

  act(() => result.current('before'))
  unmount()
  result.current('after')

  expect(effect.mock.calls).toEqual([['before']])
})

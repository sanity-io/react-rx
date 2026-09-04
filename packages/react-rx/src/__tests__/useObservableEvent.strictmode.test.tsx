/* oxlint-disable typescript/no-deprecated -- exercises the v6 surface that v7 removes */
import {act, renderHook} from '@testing-library/react'
import {Observable, scan, tap} from 'rxjs'
import {expect, test} from 'vitest'

import {useObservableEvent} from '../useObservableEvent'

test('StrictMode double-mount rebuilds the pipeline: unsubscribe the first, resubscribe fresh', () => {
  const handlerBuilds: number[] = []
  const lifecycle: string[] = []

  const {unmount} = renderHook(
    () =>
      useObservableEvent((events$: Observable<string>) => {
        handlerBuilds.push(handlerBuilds.length)
        return events$.pipe(
          tap({
            subscribe: () => lifecycle.push('subscribe'),
            unsubscribe: () => lifecycle.push('unsubscribe'),
          }),
        )
      }),
    {reactStrictMode: true},
  )

  // One pipeline per effect run: mount, simulated unmount, remount.
  expect(handlerBuilds).toHaveLength(2)
  expect(lifecycle).toEqual(['subscribe', 'unsubscribe', 'subscribe'])

  unmount()
  expect(lifecycle).toEqual(['subscribe', 'unsubscribe', 'subscribe', 'unsubscribe'])
})

test('StrictMode delivers each event exactly once', () => {
  const seen: string[] = []
  const {result} = renderHook(
    () =>
      useObservableEvent((events$: Observable<string>) =>
        events$.pipe(tap((value) => seen.push(value))),
      ),
    {reactStrictMode: true},
  )

  act(() => result.current('a'))
  act(() => result.current('b'))
  // Only the surviving subscription processes events — no double delivery.
  expect(seen).toEqual(['a', 'b'])
})

test('StrictMode keeps the callback identity stable and stream state intact across the double mount', () => {
  const totals: number[] = []
  const {result, rerender} = renderHook(
    () =>
      useObservableEvent((events$: Observable<number>) =>
        events$.pipe(
          scan((total, n) => total + n, 0),
          tap((total) => totals.push(total)),
        ),
      ),
    {reactStrictMode: true},
  )

  const first = result.current
  rerender()
  expect(result.current).toBe(first)

  act(() => result.current(1))
  act(() => result.current(2))
  // A single live scan accumulator: the discarded StrictMode pipeline left no trace.
  expect(totals).toEqual([1, 3])
})

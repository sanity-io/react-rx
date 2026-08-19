import {act, render, renderHook} from '@testing-library/react'
import {Component, type ReactNode} from 'react'
import {mergeMap, of, Subject, throwError} from 'rxjs'
import {expect, test, vi} from 'vitest'

import {useObservable} from '../useObservable'
import {useSyncObservable} from '../useSyncObservable'

/**
 * Emission delivery in `useObservable` is paced to React's render cycle: a value is delivered
 * immediately when React is quiet (the leading edge stays synchronous), and while a delivered
 * value is still being rendered, newer emissions are held with only the latest delivered once
 * the main thread goes idle again. This bounds useSyncExternalStore-triggered restarts of
 * concurrent render passes to one per commit cycle, so a source that emits faster than a render
 * pass can complete no longer starves it forever.
 *
 * jsdom has no `requestIdleCallback`, so these tests exercise the `setTimeout(0)` fallback: the
 * idle window closes on the next macrotask. That validates the pacing semantics (coalescing,
 * trailing delivery, snapshot consistency) but not the browser idle signal itself — the timing
 * of the real fix needs a browser, where `requestIdleCallback` fires only after an in-flight
 * pass commits.
 */

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/** Close the currently open render-idle window (jsdom: the setTimeout(0) fallback). */
const idle = () =>
  act(async () => {
    await wait(0)
  })

test('a burst of emissions delivers the first synchronously, holds the rest, then delivers only the latest once idle', async () => {
  const values$ = new Subject<string>()
  const {result, unmount} = renderHook(() => useObservable(values$, 'initial'))

  act(() => {
    values$.next('a')
    values$.next('b')
    values$.next('c')
  })
  // 'a' was the leading edge; 'b' and 'c' landed inside its render-idle window.
  expect(result.current).toBe('a')

  await idle()
  // Only the latest held value is delivered — 'b' is never rendered.
  expect(result.current).toBe('c')

  unmount()
})

test('intermediate values in a burst are never rendered', async () => {
  const values$ = new Subject<number>()
  const rendered: number[] = []

  function ObservableComponent() {
    rendered.push(useObservable(values$, 0))
    return null
  }
  const {unmount} = render(<ObservableComponent />)

  act(() => {
    for (let i = 1; i <= 10; i++) {
      values$.next(i)
    }
  })
  await idle()

  expect(rendered).toContain(1) // leading edge
  expect(rendered).toContain(10) // trailing delivery
  expect(rendered).not.toContain(5) // coalesced away
  unmount()
})

test('isolated emissions are delivered synchronously with no added latency', async () => {
  const values$ = new Subject<string>()
  const {result, unmount} = renderHook(() => useObservable(values$))

  act(() => values$.next('first'))
  expect(result.current).toBe('first')

  await idle()
  act(() => values$.next('second'))
  expect(result.current).toBe('second')

  unmount()
})

test('useSyncObservable stays fully live while useObservable coalesces the same burst', async () => {
  const values$ = new Subject<string>()
  const seen: Array<{sync: string; paced: string}> = []

  function ObservableComponent() {
    const paced = useObservable(values$, 'initial')
    const sync = useSyncObservable(values$, 'initial')
    seen.push({sync, paced})
    return null
  }
  const {unmount} = render(<ObservableComponent />)

  act(() => values$.next('a'))
  act(() => values$.next('b'))
  // The live hook delivered 'b' synchronously; the paced hook is still holding it.
  expect(seen.at(-1)).toEqual({sync: 'b', paced: 'a'})

  await idle()
  expect(seen.at(-1)).toEqual({sync: 'b', paced: 'b'})

  unmount()
})

test('all paced consumers of the same observable read one consistent paced snapshot', async () => {
  const values$ = new Subject<string>()
  const first = renderHook(() => useObservable(values$, 'initial'))
  const second = renderHook(() => useObservable(values$, 'initial'))

  act(() => values$.next('a'))
  act(() => values$.next('b'))
  expect(first.result.current).toBe('a')
  expect(second.result.current).toBe('a')

  await idle()
  expect(first.result.current).toBe('b')
  expect(second.result.current).toBe('b')

  first.unmount()
  second.unmount()
})

class Boundary extends Component<{children: ReactNode}, {error: Error | null}> {
  override state: {error: Error | null} = {error: null}
  static getDerivedStateFromError(error: Error) {
    return {error}
  }
  override render() {
    return this.state.error ? <>caught:{this.state.error.message}</> : this.props.children
  }
}

test('an error emitted while a value is in flight arrives as the trailing delivery instead of being lost', async () => {
  const subject = new Subject<{error: boolean; message: string}>()
  const messages = subject.pipe(
    mergeMap((value) =>
      value.error ? throwError(() => new Error(value.message)) : of(value.message),
    ),
  )

  function ObservableComponent() {
    return <>{useObservable(messages, 'initial')}</>
  }
  const {container, rerender} = render(
    <Boundary>
      <ObservableComponent />
    </Boundary>,
  )

  act(() => subject.next({error: false, message: 'v1'}))
  expect(container.textContent).toBe('v1')

  // The error lands inside v1's render-idle window: paced consumers keep rendering v1 for now.
  subject.next({error: true, message: 'Boom'})
  rerender(
    <Boundary>
      <ObservableComponent />
    </Boundary>,
  )
  expect(container.textContent).toBe('v1')

  // Once the window closes, the held error is delivered and thrown from the render phase.
  const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  try {
    await idle()
  } finally {
    consoleErrorSpy.mockRestore()
  }
  expect(container.textContent).toBe('caught:Boom')
})

test('a source that completes while a trailing value is held still delivers that value', async () => {
  const values$ = new Subject<string>()
  const {result, unmount} = renderHook(() => useObservable(values$, 'initial'))

  act(() => values$.next('a'))
  act(() => {
    values$.next('b')
    values$.complete()
  })
  expect(result.current).toBe('a')

  await idle()
  expect(result.current).toBe('b')

  unmount()
})

test('a remount after the paced pipeline disconnects renders the latest live value, not a stale paced snapshot', async () => {
  const values$ = new Subject<string>()
  // A live subscriber keeps the source subscription and cache entry alive throughout.
  const keeper = renderHook(() => useSyncObservable(values$, 'initial'))

  const first = renderHook(() => useObservable(values$, 'initial'))
  act(() => values$.next('a'))
  act(() => values$.next('b'))
  // 'b' is held in the paced pipeline when the only paced subscriber unmounts.
  expect(first.result.current).toBe('a')
  first.unmount()

  await act(async () => {
    await wait(0)
  })
  expect(keeper.result.current).toBe('b')

  // The paced pipeline reset on disconnect, so the remount must fall back to the live
  // snapshot ('b') instead of replaying the stale paced one ('a').
  const second = renderHook(() => useObservable(values$, 'initial'))
  expect(second.result.current).toBe('b')

  second.unmount()
  keeper.unmount()
})

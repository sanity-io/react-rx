import {act, fireEvent, render, screen, within} from '@testing-library/react'
import {StrictMode} from 'react'
import {hydrateRoot} from 'react-dom/client'
import {renderToString} from 'react-dom/server'
import {afterEach, describe, expect, test, vi, type MockInstance} from 'vitest'

import BasicStateApp from '../../../../website/src/examples/basic-state/App'
import SimpleApp from '../../../../website/src/examples/simple/App'
import SyncApp from '../../../../website/src/examples/sync/App'
import TimeAgoSsrApp from '../../../../website/src/examples/time-ago-ssr/App'
import {
  LiveClock,
  type ServerSnapshot,
} from '../../../../website/src/examples/time-ago-ssr/LiveClock'
import {TimeAgo} from '../../../../website/src/examples/time-ago/TimeAgo'

afterEach(() => {
  vi.useRealTimers()
})

// Reads the trailing integer in an element's text, e.g. "Ticks: 3" -> 3.
function trailingNumber(element: Element | null): number {
  const match = (element?.textContent ?? '').match(/(\d+)\s*$/)
  return Number(match?.[1])
}

// Reads the first integer in an element's text, e.g. "react-rx: 2 clicks" -> 2.
function firstNumber(element: Element | null): number {
  const match = (element?.textContent ?? '').match(/(\d+)/)
  return Number(match?.[1])
}

function throttledCount(): number {
  return trailingNumber(screen.getByText(/Throttled to 1\/sec:/))
}

function parityLabel(): string {
  return screen.getByText(/Mapped to parity:/).textContent?.trim() ?? ''
}

function timeText(container: HTMLElement): string {
  return container.querySelector('time')?.textContent ?? ''
}

// The count sits mid-text, e.g. "(2 emissions)".
function emissionCount(container: HTMLElement): number {
  const match = (container.querySelector('small')?.textContent ?? '').match(/(\d+)/)
  return Number(match?.[1])
}

// The same serialized snapshot a server would render and ship to the client.
function makeSnapshot(publishedAt: number): ServerSnapshot {
  return {publishedAt, initial: {unit: 'second', value: 55}, locale: 'en'}
}

function hostTime(): string {
  return document.querySelector('section time')?.textContent ?? ''
}

describe('simple clicks example', () => {
  test('the manual and react-rx counters each count their own clicks', () => {
    render(<SimpleApp />)
    const manual = screen.getByRole('button', {name: /React \+ RxJS:/})
    const reactRx = screen.getByRole('button', {name: /react-rx:/})

    expect(firstNumber(manual)).toBe(0)
    expect(firstNumber(reactRx)).toBe(0)

    fireEvent.click(manual)
    fireEvent.click(manual)
    fireEvent.click(manual)
    fireEvent.click(reactRx)

    // Independent streams: each button only counts its own clicks.
    expect(firstNumber(manual)).toBe(3)
    expect(firstNumber(reactRx)).toBe(1)
  })

  test('throttleTime drops bursts while map transforms the count to parity', async () => {
    vi.useFakeTimers()
    render(<SimpleApp />)
    const button = screen.getByRole('button', {name: 'Click quickly'})

    expect(throttledCount()).toBe(0)

    // Three clicks inside one throttle window: only the leading one is counted.
    fireEvent.click(button)
    fireEvent.click(button)
    fireEvent.click(button)
    expect(throttledCount()).toBe(1)
    expect(parityLabel()).toMatch(/odd$/)

    // Let the 1s window elapse, then click once more: the throttled row advances
    // and the mapped parity flips to even.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000)
    })
    fireEvent.click(button)
    expect(throttledCount()).toBe(2)
    expect(parityLabel()).toMatch(/even$/)
  })
})

describe('basic-state controlled form example', () => {
  test('the text field is controlled and greets the typed name', () => {
    render(<BasicStateApp />)
    const input = screen.getByLabelText(/Your name/) as HTMLInputElement

    expect(input.value).toBe('')
    expect(screen.getByText(/^Hello,/).textContent).toBe('Hello, stranger.')

    fireEvent.change(input, {target: {value: 'Ada'}})

    // Controlled: the DOM value is driven by the observable state.
    expect(input.value).toBe('Ada')
    expect(screen.getByText(/^Hello,/).textContent).toBe('Hello, Ada.')
  })

  test('the checkbox is controlled and toggles the subscription message', () => {
    render(<BasicStateApp />)
    const checkbox = screen.getByRole('checkbox') as HTMLInputElement

    expect(checkbox.checked).toBe(false)
    expect(screen.getByText('You are not subscribed.')).toBeTruthy()

    fireEvent.click(checkbox)

    expect(checkbox.checked).toBe(true)
    expect(screen.getByText('You are subscribed.')).toBeTruthy()
  })

  test('two fields fold into one form value via scan', () => {
    render(<BasicStateApp />)
    const first = screen.getByLabelText(/First name/) as HTMLInputElement
    const last = screen.getByLabelText(/Last name/) as HTMLInputElement

    expect(screen.getByText(/^Full name:/).textContent).toBe('Full name: Not entered yet')

    fireEvent.change(first, {target: {value: 'Ada'}})
    fireEvent.change(last, {target: {value: 'Lovelace'}})

    expect(first.value).toBe('Ada')
    expect(last.value).toBe('Lovelace')
    expect(screen.getByText(/^Full name:/).textContent).toBe('Full name: Ada Lovelace')
  })
})

describe('sync pause/resume timer example', () => {
  // The same lesson for both implementations: pausing keeps the running total,
  // and a faster interval produces ticks faster after resuming.
  describe.each([['React useInterval'], ['RxJS switchMap + scan']])('%s', (legend) => {
    test('retains the counter across a pause and respects a changed interval', async () => {
      vi.useFakeTimers()
      render(<SyncApp />)

      const fieldset = screen.getByText(legend).closest('fieldset')
      expect(fieldset).not.toBeNull()
      if (!fieldset) return
      const ui = within(fieldset)
      const ticks = () => trailingNumber(ui.getByText(/Ticks:/))

      expect(ticks()).toBe(0)

      fireEvent.click(ui.getByRole('button', {name: 'Start'}))
      await act(async () => {
        await vi.advanceTimersByTimeAsync(3000)
      })
      expect(ticks()).toBe(3)

      // Pause: no further ticks, and the total is retained (not reset).
      fireEvent.click(ui.getByRole('button', {name: 'Pause'}))
      await act(async () => {
        await vi.advanceTimersByTimeAsync(5000)
      })
      expect(ticks()).toBe(3)

      // Resume at a faster interval: three more ticks in 600ms, continuing from 3.
      fireEvent.change(ui.getByRole('slider'), {target: {value: '200'}})
      fireEvent.click(ui.getByRole('button', {name: 'Start'}))
      await act(async () => {
        await vi.advanceTimersByTimeAsync(600)
      })
      expect(ticks()).toBe(6)
    })
  })
})

describe('time-ago example', () => {
  test('crosses the minute threshold and then stops emitting per second', async () => {
    vi.useFakeTimers()
    // 59 seconds in the past: one second from flipping to the "minute" unit.
    const date = new Date(Date.now() - 59_000)
    const {container} = render(<TimeAgo date={date} locale="en" />)

    // Flush the timer's immediate first tick.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(timeText(container)).toMatch(/59 seconds ago/)
    expect(emissionCount(container)).toBe(1)

    // One more second: the label changes unit to minutes — a new emission.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000)
    })
    expect(timeText(container)).toMatch(/1 minute ago/)
    expect(timeText(container)).not.toMatch(/second/)
    expect(emissionCount(container)).toBe(2)

    // Thirty more seconds of ticks within the same minute: distinctUntilChanged
    // collapses them, so no new value reaches React.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000)
    })
    expect(timeText(container)).toMatch(/1 minute ago/)
    expect(timeText(container)).not.toMatch(/second/)
    expect(emissionCount(container)).toBe(2)
  })
})

describe('time-ago-ssr hydration example', () => {
  let consoleErrorSpy: MockInstance<(...data: unknown[]) => void> | undefined

  afterEach(() => {
    consoleErrorSpy?.mockRestore()
    consoleErrorSpy = undefined
  })

  function hydrationErrors(): string[] {
    return (consoleErrorSpy?.mock.calls ?? [])
      .map((args: unknown[]) => String(args[0]))
      .filter((message: string) =>
        /hydrat|did not match|Text content does not match/i.test(message),
      )
  }

  test('LiveClock hydrates the captured server snapshot with no mismatch, then ticks live', async () => {
    vi.useFakeTimers()
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const snapshot = makeSnapshot(Date.now() - 55_000)
    const html = renderToString(<LiveClock snapshot={snapshot} />)
    expect(html).toMatch(/55 seconds ago/)

    const container = document.createElement('div')
    container.innerHTML = html
    document.body.appendChild(container)

    let root!: ReturnType<typeof hydrateRoot>
    await act(async () => {
      root = hydrateRoot(container, <LiveClock snapshot={snapshot} />)
    })

    // The server snapshot is reused on hydration — same text, no mismatch.
    expect(hydrationErrors()).toEqual([])
    expect(container.querySelector('time')?.textContent).toMatch(/55 seconds ago/)

    // Five seconds later the elapsed label rolls over to minutes, live.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000)
    })
    expect(container.querySelector('time')?.textContent).toMatch(/1 minute ago/)

    await act(async () => {
      root.unmount()
    })
    container.remove()
  })

  test('StrictMode hydration is cleanup-safe (double-invoked, no mismatch)', async () => {
    vi.useFakeTimers()
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const snapshot = makeSnapshot(Date.now() - 55_000)
    const html = renderToString(
      <StrictMode>
        <LiveClock snapshot={snapshot} />
      </StrictMode>,
    )

    const container = document.createElement('div')
    container.innerHTML = html
    document.body.appendChild(container)

    let root!: ReturnType<typeof hydrateRoot>
    await act(async () => {
      root = hydrateRoot(
        container,
        <StrictMode>
          <LiveClock snapshot={snapshot} />
        </StrictMode>,
      )
    })

    expect(hydrationErrors()).toEqual([])
    expect(container.querySelector('time')?.textContent).toMatch(/55 seconds ago/)

    await act(async () => {
      root.unmount()
    })
    expect(hydrationErrors()).toEqual([])
    container.remove()
  })

  test('the App demo shows server HTML, then hydrates on demand with zero captured errors', async () => {
    vi.useFakeTimers()
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const {unmount} = render(<TimeAgoSsrApp />)

    // Before hydration: the host already shows useful server markup.
    expect(screen.getByRole('status').textContent).toBe('Server HTML only')
    expect(hostTime()).toMatch(/55 seconds ago/)

    // Hydrate on demand; the snapshot is reused so no recoverable errors fire.
    fireEvent.click(screen.getByRole('button', {name: 'Hydrate'}))
    await act(async () => {})

    expect(hydrationErrors()).toEqual([])
    expect(screen.getByRole('status').textContent).toBe('Hydrated')
    expect(screen.getByText(/Hydration errors captured:/).textContent).toMatch(/0\s*$/)
    expect(hostTime()).toMatch(/55 seconds ago/)

    // After hydration the live stream advances the label.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000)
    })
    expect(hostTime()).toMatch(/1 minute ago/)

    // The App unmounts its nested hydration root cleanly (no errors).
    await act(async () => {
      unmount()
      await Promise.resolve()
    })
    expect(hydrationErrors()).toEqual([])
  })

  test('delayed hydration keeps the server text and captures zero recoverable errors before ticks', async () => {
    vi.useFakeTimers()
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const {unmount} = render(<TimeAgoSsrApp />)

    // The server HTML is already useful and on screen before any hydration.
    expect(screen.getByRole('status').textContent).toBe('Server HTML only')
    expect(hostTime()).toMatch(/55 seconds ago/)

    // The reader waits well past the captured instant — real client time now drifts
    // past the snapshot. The static server markup is unaffected: no stream yet.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000)
    })
    expect(hostTime()).toMatch(/55 seconds ago/)
    expect(screen.getByText(/Hydration errors captured:/).textContent).toMatch(/0\s*$/)

    // Hydrate after the delay, but do not advance the stream yet. The server snapshot —
    // not the drifted client clock — governs the initial client render, so the text is
    // identical to the server HTML: hydration reconciles with zero recoverable errors.
    fireEvent.click(screen.getByRole('button', {name: 'Hydrate'}))
    await act(async () => {})
    expect(screen.getByRole('status').textContent).toBe('Hydrated')
    expect(hydrationErrors()).toEqual([])
    expect(hostTime()).toMatch(/55 seconds ago/)
    expect(screen.getByText(/Hydration errors captured:/).textContent).toMatch(/0\s*$/)

    // Only now does the live stream emit, catching up to the true elapsed time: the
    // 10s drift pushes the label past a minute. This tick happens after hydration, not
    // during it, so it never counts as a mismatch.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(hostTime()).toMatch(/1 minute ago/)
    expect(hydrationErrors()).toEqual([])
    expect(screen.getByText(/Hydration errors captured:/).textContent).toMatch(/0\s*$/)

    await act(async () => {
      unmount()
      await Promise.resolve()
    })
    expect(hydrationErrors()).toEqual([])
  })
})

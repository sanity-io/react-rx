import {act, fireEvent, render, screen} from '@testing-library/react'
import {StrictMode} from 'react'
import {hydrateRoot, type Root} from 'react-dom/client'
import {renderToString} from 'react-dom/server'
import {afterEach, expect, test, vi} from 'vitest'

import App from '../../../../website/src/examples/time-ago-ssr/App'
import {
  LiveClock,
  type ServerSnapshot,
} from '../../../../website/src/examples/time-ago-ssr/LiveClock'

afterEach(() => vi.useRealTimers())

test('serialized server props survive a delayed hydration before the live clock catches up', async () => {
  vi.useFakeTimers()
  const now = Date.UTC(2026, 9, 12, 12)
  vi.setSystemTime(now)
  const serverSnapshot: ServerSnapshot = {
    publishedAt: now - 55_000,
    initial: {unit: 'second', value: 55},
    locale: 'en',
  }
  const html = renderToString(<LiveClock snapshot={serverSnapshot} />)
  const payload = JSON.stringify(serverSnapshot)
  const container = document.createElement('div')
  document.body.append(container)
  container.innerHTML = html
  const serverElement = container.firstElementChild
  const parsedHtml = container.innerHTML
  expect(container.textContent).toBe('55 seconds ago')
  expect(vi.getTimerCount()).toBe(0)

  vi.setSystemTime(now + 20_000)
  const errors: unknown[] = []
  const onHydrated = vi.fn()
  let root: Root | undefined
  try {
    await act(async () => {
      root = hydrateRoot(
        container,
        <LiveClock snapshot={JSON.parse(payload)} onHydrated={onHydrated} />,
        {onRecoverableError: (error) => errors.push(error)},
      )
    })
    expect(onHydrated).toHaveBeenCalled()
    expect(container.innerHTML).toBe(parsedHtml)
    expect(container.firstElementChild).toBe(serverElement)

    await act(() => vi.advanceTimersByTimeAsync(0))
    expect(container.textContent).toBe('1 minute ago')
    expect(errors).toEqual([])
  } finally {
    await act(async () => root?.unmount())
    container.remove()
  }
})

test('the sandbox shows useful HTML before the Hydrate button is pressed under StrictMode', async () => {
  vi.useFakeTimers()
  const view = render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
  expect(screen.getByRole('status').textContent).toBe('Server HTML only')
  expect(screen.getByText('55 seconds ago')).toBeTruthy()

  await act(() => vi.advanceTimersByTimeAsync(20_000))
  expect(screen.getByText('55 seconds ago')).toBeTruthy()
  await act(async () => fireEvent.click(screen.getByRole('button', {name: 'Hydrate'})))
  expect(screen.getByRole('status').textContent).toBe('Hydrated')
  await act(() => vi.advanceTimersByTimeAsync(0))
  expect(screen.getByText('1 minute ago')).toBeTruthy()
  expect(screen.getByText('Hydration errors captured: 0')).toBeTruthy()

  await act(async () => {
    view.unmount()
    vi.runAllTicks()
  })
  expect(vi.getTimerCount()).toBe(0)
})

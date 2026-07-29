import {act, render, screen} from '@testing-library/react'
import {Suspense, useState, type ReactNode} from 'react'
import {Subject} from 'rxjs'
import {afterEach, expect, test} from 'vitest'

import {useObservable} from '../useObservable'
import {useSyncObservable} from '../useSyncObservable'

/**
 * Suspense interaction tests inspired by jantimon/react-hydration-rules and the
 * useSyncExternalStore / useDeferredValue caveats on react.dev.
 *
 * Suspending children *depend on* the observable value so React Compiler
 * memoization cannot prevent fallbacks by skipping the subtree.
 */

type CacheEntry = {
  promise: Promise<string>
  resolve: (value: string) => void
  value?: string
}

const cache = new Map<string, CacheEntry>()

function getEntry(key: string): CacheEntry {
  let entry = cache.get(key)
  if (!entry) {
    let resolve!: (value: string) => void
    const promise = new Promise<string>((r) => {
      resolve = r
    })
    entry = {promise, resolve}
    cache.set(key, entry)
  }
  return entry
}

function resolveKey(key: string) {
  const entry = getEntry(key)
  entry.value = key
  entry.resolve(key)
}

function SuspendOn({value}: {value: string}) {
  const entry = getEntry(value)
  if (entry.value === undefined) {
    throw entry.promise
  }
  return <div data-testid="content">{entry.value}</div>
}

function withSuspense(child: ReactNode) {
  return (
    <Suspense fallback={<div data-testid="fallback">loading</div>}>{child}</Suspense>
  )
}

afterEach(() => {
  cache.clear()
})

test('useSyncObservable: a store update that suspends replaces visible content with the fallback', async () => {
  // Port of SuspenseFallbackOnExternalStore — uSES mutations always trigger the fallback.
  resolveKey('v1')
  const subject = new Subject<string>()

  function App() {
    const value = useSyncObservable(subject, 'v1')
    return withSuspense(<SuspendOn value={value} />)
  }

  render(<App />)
  expect(screen.getByTestId('content').textContent).toBe('v1')
  expect(screen.queryByTestId('fallback')).toBeNull()

  await act(async () => {
    subject.next('v2')
  })
  // React 19 keeps prior content in the DOM with display:none while the fallback is shown.
  expect(screen.getByTestId('fallback')).toBeTruthy()
  expect(screen.getByTestId('content').style.display).toBe('none')

  await act(async () => {
    resolveKey('v2')
    await getEntry('v2').promise
  })
  expect(screen.getByTestId('content').textContent).toBe('v2')
  expect(screen.getByTestId('content').style.display).not.toBe('none')
  expect(screen.queryByTestId('fallback')).toBeNull()
})

test('useObservable: a store update that suspends keeps the previous content, no fallback', async () => {
  // Port of react.dev "preventing unwanted fallbacks" — deferred updates preserve revealed content.
  // Even though `act` flushes deferred lanes, a suspended deferred update keeps prior UI.
  resolveKey('v1')
  const subject = new Subject<string>()

  function App() {
    const value = useObservable(subject, 'v1')
    return withSuspense(<SuspendOn value={value} />)
  }

  render(<App />)
  expect(screen.getByTestId('content').textContent).toBe('v1')
  expect(screen.queryByTestId('fallback')).toBeNull()

  await act(async () => {
    subject.next('v2')
  })
  expect(screen.getByTestId('content').textContent).toBe('v1')
  expect(screen.getByTestId('content').style.display).not.toBe('none')
  expect(screen.queryByTestId('fallback')).toBeNull()

  await act(async () => {
    resolveKey('v2')
    await getEntry('v2').promise
  })
  expect(screen.getByTestId('content').textContent).toBe('v2')
  expect(screen.queryByTestId('fallback')).toBeNull()
})

test('isStale pattern: useSyncObservable !== useObservable while a deferred update is pending', async () => {
  // `act` flushes deferred lanes, so we capture per-render values instead of asserting DOM mid-flight.
  resolveKey('v1')
  resolveKey('v2')
  const subject = new Subject<string>()
  const pairs: Array<{sync: string; deferred: string}> = []

  function App() {
    const deferred = useObservable(subject, 'v1')
    const sync = useSyncObservable(subject, 'v1')
    pairs.push({sync, deferred})
    return (
      <div>
        <div data-testid="sync">{sync}</div>
        <div data-testid="deferred">{deferred}</div>
        {withSuspense(<SuspendOn value={deferred} />)}
      </div>
    )
  }

  render(<App />)
  expect(pairs.some((p) => p.sync === p.deferred && p.sync === 'v1')).toBe(true)

  await act(async () => {
    subject.next('v2')
  })
  // At least one render saw sync ahead of deferred (the urgent pass).
  expect(pairs.some((p) => p.sync === 'v2' && p.deferred === 'v1')).toBe(true)
  expect(screen.getByTestId('sync').textContent).toBe('v2')
  expect(screen.getByTestId('deferred').textContent).toBe('v2')
})

test('newly mounted Suspense boundaries still show their fallback under useObservable', async () => {
  // Deferral only protects already-revealed content.
  resolveKey('ready')
  const subject = new Subject<string>()

  function App() {
    const value = useObservable(subject, 'ready')
    const [show, setShow] = useState(false)
    return (
      <div>
        <button type="button" onClick={() => setShow(true)}>
          show
        </button>
        <div data-testid="value">{value}</div>
        {show ? withSuspense(<SuspendOn value="pending-new" />) : null}
      </div>
    )
  }

  render(<App />)
  expect(screen.getByTestId('value').textContent).toBe('ready')

  await act(async () => {
    screen.getByRole('button', {name: 'show'}).click()
  })
  expect(screen.getByTestId('fallback')).toBeTruthy()
  expect(screen.queryByTestId('content')).toBeNull() // never mounted — brand-new boundary
})

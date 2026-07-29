import {act, screen} from '@testing-library/react'
import {Suspense, type ReactNode} from 'react'
import {hydrateRoot} from 'react-dom/client'
import {renderToString} from 'react-dom/server'
import {map, Observable, of, Subject, timer} from 'rxjs'
import {afterEach, expect, test, vi, type MockInstance} from 'vitest'

import {useObservable} from '../useObservable'
import {useSyncObservable} from '../useSyncObservable'

type CacheEntry = {
  promise: Promise<string>
  resolve: (value: string) => void
  value?: string
}

const suspendCache = new Map<string, CacheEntry>()

function getEntry(key: string): CacheEntry {
  let entry = suspendCache.get(key)
  if (!entry) {
    let resolve!: (value: string) => void
    const promise = new Promise<string>((r) => {
      resolve = r
    })
    entry = {promise, resolve}
    suspendCache.set(key, entry)
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

let container: HTMLDivElement | undefined
let consoleErrorSpy: MockInstance<(...data: unknown[]) => void> | undefined
const roots: Array<ReturnType<typeof hydrateRoot>> = []

afterEach(async () => {
  const toUnmount = roots.splice(0)
  await act(async () => {
    for (const root of toUnmount) {
      root.unmount()
    }
  })
  container?.remove()
  container = undefined
  consoleErrorSpy?.mockRestore()
  consoleErrorSpy = undefined
  suspendCache.clear()
})

async function hydrate(ui: ReactNode, html: string) {
  container = document.createElement('div')
  container.innerHTML = html
  document.body.appendChild(container)
  consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  let root!: ReturnType<typeof hydrateRoot>
  await act(async () => {
    root = hydrateRoot(container!, ui)
  })
  roots.push(root)
  return root
}

function hydrationErrors() {
  return (consoleErrorSpy?.mock.calls ?? [])
    .map((args: unknown[]) => String(args[0]))
    .filter((msg: string) => /hydrat|did not match|Text content does not match/i.test(msg))
}

test('hydration is clean for both hooks when the observable has not emitted (initialValue everywhere)', async () => {
  // Use a long timer so act() during hydrate does not flush an emission.
  const observable = timer(60_000).pipe(map(() => 'later'))

  function SyncApp() {
    return <div data-testid="sync-value">{useSyncObservable(observable, 'initial')}</div>
  }
  function DeferredApp() {
    return <div data-testid="deferred-value">{useObservable(observable, 'initial')}</div>
  }

  const syncHtml = renderToString(<SyncApp />)
  expect(syncHtml).toContain('initial')
  await hydrate(<SyncApp />, syncHtml)
  expect(hydrationErrors()).toEqual([])
  expect(screen.getByTestId('sync-value').textContent).toBe('initial')

  await act(async () => {
    roots.pop()?.unmount()
  })
  container?.remove()
  consoleErrorSpy?.mockRestore()

  const deferredHtml = renderToString(<DeferredApp />)
  expect(deferredHtml).toContain('initial')
  await hydrate(<DeferredApp />, deferredHtml)
  expect(hydrationErrors()).toEqual([])
  expect(screen.getByTestId('deferred-value').textContent).toBe('initial')
})

test('useObservable: deterministic sync-emitting observable + initialValue hydrates cleanly against server HTML showing the emission', async () => {
  const observable = of('sync')

  function App() {
    return <div data-testid="value">{useObservable(observable, 'initial')}</div>
  }

  const html = renderToString(<App />)
  expect(html).toContain('sync')
  expect(html).not.toContain('initial')

  await hydrate(<App />, html)
  expect(hydrationErrors()).toEqual([])
  expect(screen.getByTestId('value').textContent).toBe('sync')
})

test('useObservable: async observable without initialValue server-renders nothing and hydrates cleanly', async () => {
  const observable = timer(60_000).pipe(map(() => 'later'))

  function App() {
    const value = useObservable(observable)
    return <div data-testid="value">{value ?? ''}</div>
  }

  const html = renderToString(<App />)
  expect(html).toBe('<div data-testid="value"></div>')

  await hydrate(<App />, html)
  expect(hydrationErrors()).toEqual([])
  expect(screen.getByTestId('value').textContent).toBe('')
})

test('useObservable: a NON-deterministic sync emission surfaces a hydration mismatch', async () => {
  // Documentation test: snapshot-based getServerSnapshot no longer masks per-subscription
  // non-determinism the way an initialValue-based getServerSnapshot did.
  // React 19 may report the mismatch via console.error and/or as an uncaught exception;
  // either signal counts.
  let n = 0
  const observable = new Observable<string>((subscriber) => {
    subscriber.next(`emit-${n++}`)
  })

  function App() {
    return <div data-testid="value">{useObservable(observable, 'initial')}</div>
  }

  const html = renderToString(<App />)
  expect(html).toContain('emit-0')

  const uncaught: unknown[] = []
  const onUnhandled = (event: ErrorEvent) => {
    uncaught.push(event.error ?? event.message)
    event.preventDefault()
  }
  window.addEventListener('error', onUnhandled)
  try {
    await hydrate(<App />, html)
  } finally {
    window.removeEventListener('error', onUnhandled)
  }

  const sawConsoleMismatch = hydrationErrors().length > 0
  const sawUncaughtMismatch = uncaught.some((err) =>
    /hydrat|did not match|Text content does not match/i.test(String(err)),
  )
  expect(sawConsoleMismatch || sawUncaughtMismatch).toBe(true)
})

test('useSyncObservable: an emission right after hydration that suspends replaces server-rendered content with the fallback', async () => {
  resolveKey('v1')
  const subject = new Subject<string>()

  function App() {
    const value = useSyncObservable(subject, 'v1')
    return withSuspense(<SuspendOn value={value} />)
  }

  const html = renderToString(<App />)
  expect(html).toContain('v1')

  await hydrate(<App />, html)
  expect(screen.getByTestId('content').textContent).toBe('v1')

  await act(async () => {
    subject.next('v2')
  })
  // React 19 keeps prior content in the DOM with display:none while the fallback is shown.
  expect(screen.getByTestId('fallback')).toBeTruthy()
  expect(screen.getByTestId('content').style.display).toBe('none')
})

test('useObservable: the same emission keeps the server-rendered content and swaps in the value without a fallback', async () => {
  resolveKey('v1')
  const subject = new Subject<string>()

  function App() {
    const value = useObservable(subject, 'v1')
    return withSuspense(<SuspendOn value={value} />)
  }

  const html = renderToString(<App />)
  expect(html).toContain('v1')

  await hydrate(<App />, html)
  expect(screen.getByTestId('content').textContent).toBe('v1')

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

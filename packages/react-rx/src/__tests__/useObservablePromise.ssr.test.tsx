// @vitest-environment node
//
// Server rendering runs without a `window`, and react-rx is a client-only
// library: on the server, observables are never subscribed. These tests run in
// a node environment (like a real server) so that guarantee is exercised for
// the hook and for preloadObservablePromise's server no-op.
import {Suspense, use} from 'react'
import {renderToString} from 'react-dom/server'
import {defer, from, Observable} from 'rxjs'
import {expect, test} from 'vitest'

import {preloadObservablePromise, useObservablePromise} from '../useObservablePromise'

function Reader({promise}: {promise: Promise<string>}) {
  const value = use(promise)
  return <div data-testid="value">{value}</div>
}

/** The sanctioned shape: hook caller above the boundary, use() reader below. */
function Owner({observable}: {observable: Observable<string>}) {
  const promise = useObservablePromise(observable)
  return (
    <Suspense fallback={<div data-testid="fallback">loading</div>}>
      <Reader promise={promise} />
    </Suspense>
  )
}

test('renderToString shows the Suspense fallback for a pending promise', () => {
  const observable = defer(
    () =>
      new Promise<string>(() => {
        /* never resolves during SSR */
      }),
  )

  const html = renderToString(<Owner observable={observable} />)

  expect(html).toContain('loading')
  expect(html).not.toContain('data-testid="value"')
})

test('the server never subscribes the source: even sync observables render the fallback', () => {
  let subscriptions = 0
  const observable = new Observable<string>((subscriber) => {
    subscriptions++
    subscriber.next('ssr-sync')
    subscriber.complete()
  })

  const html = renderToString(<Owner observable={observable} />)

  // Rendering never subscribes, and on the server there is no commit to start
  // the fetch afterwards — the fallback is what server rendering emits. The
  // client starts the fetch after hydration, when the hook caller commits.
  expect(subscriptions).toBe(0)
  expect(html).toContain('loading')
  expect(html).not.toContain('ssr-sync')
})

test('preloadObservablePromise is a no-op on the server', () => {
  let subscriptions = 0
  const observable = new Observable<string>((subscriber) => {
    subscriptions++
    subscriber.next('ssr-sync')
    subscriber.complete()
  })

  // No subscription, no cache entry — just an inert pending promise. A
  // preload in shared/isomorphic code only takes effect in the browser.
  const preloaded = preloadObservablePromise(observable)
  expect(subscriptions).toBe(0)
  expect(preloaded.status).toBe('pending')

  // Rendering after the "preload" still emits the fallback.
  const html = renderToString(<Owner observable={observable} />)
  expect(subscriptions).toBe(0)
  expect(html).toContain('loading')
  expect(html).not.toContain('ssr-sync')
})

test('getServerSnapshot is provided (no uSES missing-server-snapshot error)', () => {
  const observable = from(['server'])

  // Calling the hook during SSR exercises getServerSnapshot.
  expect(() => renderToString(<Owner observable={observable} />)).not.toThrow()
})

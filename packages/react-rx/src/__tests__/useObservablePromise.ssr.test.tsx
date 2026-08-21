import {Suspense, use} from 'react'
import {renderToString} from 'react-dom/server'
import {defer, from, Observable} from 'rxjs'
import {expect, test} from 'vitest'

import {preloadObservablePromise, useObservablePromise} from '../useObservablePromise'

test('renderToString shows the Suspense fallback for a pending promise', () => {
  const observable = defer(
    () =>
      new Promise<string>(() => {
        /* never resolves during SSR */
      }),
  )

  function Child() {
    const value = use(useObservablePromise(observable))
    return <div data-testid="value">{value}</div>
  }

  const html = renderToString(
    <Suspense fallback={<div data-testid="fallback">loading</div>}>
      <Child />
    </Suspense>,
  )

  expect(html).toContain('loading')
  expect(html).not.toContain('data-testid="value"')
})

test('renderToString never subscribes the source: sync observables need a preload to render data', () => {
  let subscriptions = 0
  const observable = new Observable<string>((subscriber) => {
    subscriptions++
    subscriber.next('ssr-sync')
    subscriber.complete()
  })

  function Child() {
    const value = use(useObservablePromise(observable))
    return <div data-testid="value">{value}</div>
  }

  const ui = (
    <Suspense fallback={<div>loading</div>}>
      <Child />
    </Suspense>
  )

  // Effects never run on the server and rendering never subscribes, so even a
  // synchronously-emitting observable renders the fallback...
  const cold = renderToString(ui)
  expect(subscriptions).toBe(0)
  expect(cold).toContain('loading')
  expect(cold).not.toContain('ssr-sync')

  // ...unless the entry is warmed before rendering (route loader, server
  // request handler) — then the settled promise renders synchronously.
  void preloadObservablePromise(observable)
  const warm = renderToString(ui)
  expect(subscriptions).toBe(1)
  expect(warm).toContain('ssr-sync')
  expect(warm).not.toContain('loading')
})

test('getServerSnapshot is provided (no uSES missing-server-snapshot error)', () => {
  const observable = from(['server'])

  function Child() {
    // Calling the hook during SSR exercises getServerSnapshot.
    const promise = useObservablePromise(observable)
    const value = use(promise)
    return <span>{value}</span>
  }

  expect(() =>
    renderToString(
      <Suspense fallback={<div>loading</div>}>
        <Child />
      </Suspense>,
    ),
  ).not.toThrow()
})

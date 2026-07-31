import {Suspense, use} from 'react'
import {renderToString} from 'react-dom/server'
import {defer, from, of} from 'rxjs'
import {expect, test} from 'vitest'

import {useObservablePromise} from '../useObservablePromise'

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

test('renderToString with a sync observable renders the fulfilled value', () => {
  const observable = of('ssr-sync')

  function Child() {
    const value = use(useObservablePromise(observable))
    return <div data-testid="value">{value}</div>
  }

  const html = renderToString(
    <Suspense fallback={<div>loading</div>}>
      <Child />
    </Suspense>,
  )

  expect(html).toContain('ssr-sync')
  expect(html).not.toContain('loading')
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

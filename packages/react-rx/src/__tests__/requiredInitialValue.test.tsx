import {act, render, renderHook} from '@testing-library/react'
import {renderToString} from 'react-dom/server'
import {Observable, of, Subject} from 'rxjs'
import {describe, expect, test} from 'vitest'

import {useObservable} from '../useObservable'
import {useSyncObservable} from '../useSyncObservable'

/**
 * `initialValue` is a required argument for `useObservable` and `useSyncObservable`. Omission is
 * detected by argument arity (the internal default is the `Symbol.for('react-rx.unsetInitialValue')`
 * sentinel) and throws during render, because every value a caller can pass — `undefined`
 * included — is a valid initial value. Observables without a meaningful initial value belong to
 * `useObservablePromise` instead.
 */

const hooks = [
  {name: 'useObservable', useHook: useObservable},
  {name: 'useSyncObservable', useHook: useSyncObservable},
] as const

const double = (n: number) => n * 2
const triple = (n: number) => n * 3

describe.each(hooks)('$name: initialValue is required', ({name, useHook}) => {
  test('omitting the initialValue throws during render', () => {
    const observable = of('sync')
    function ObservableComponent() {
      // @ts-expect-error - initialValue is required; the runtime must throw as well
      return <>{useHook(observable)}</>
    }

    expect(() => render(<ObservableComponent />)).toThrow(`${name} requires an initialValue`)
  })

  test('omitting the initialValue throws during server rendering too', () => {
    const observable = of('sync')
    function ObservableComponent() {
      // @ts-expect-error - initialValue is required; the runtime must throw as well
      return <>{useHook(observable)}</>
    }

    expect(() => renderToString(<ObservableComponent />)).toThrow(
      `${name} requires an initialValue`,
    )
  })

  test('the throw happens before the observable is touched: nothing subscribes', () => {
    let subscriptions = 0
    const observable = new Observable<string>(() => {
      subscriptions++
    })
    function ObservableComponent() {
      // @ts-expect-error - initialValue is required; the runtime must throw as well
      return <>{useHook(observable)}</>
    }

    expect(() => render(<ObservableComponent />)).toThrow(`${name} requires an initialValue`)
    expect(subscriptions).toBe(0)
  })

  test('an explicit undefined is a valid initialValue: renders undefined until the observable emits', () => {
    const values$ = new Subject<string>()
    const {result, unmount} = renderHook(() => useHook(values$, undefined))

    expect(result.current).toBeUndefined()

    act(() => values$.next('emitted'))
    expect(result.current).toBe('emitted')
    unmount()
  })

  test('an explicit undefined initialValue renders on the server without throwing', () => {
    const values$ = new Subject<string>()
    function ObservableComponent() {
      return <>{useHook(values$, undefined) ?? 'nothing yet'}</>
    }

    expect(renderToString(<ObservableComponent />)).toBe('nothing yet')
  })

  test('functions act as initializers, like useState: an initializer returning a function makes that function the initial value', () => {
    const fns$ = new Subject<(n: number) => number>()
    const {result, unmount} = renderHook(() => useHook(fns$, () => double))

    // The initializer itself is called (useState semantics); its return value is the initial value.
    expect(result.current).toBe(double)
    expect(result.current(4)).toBe(8)

    act(() => fns$.next(triple))
    // Emitted functions are returned as-is — only the initialValue goes through the initializer.
    expect(result.current).toBe(triple)
    unmount()
  })

  test('an initializer returning a new object is Object.is-stable and does not exceed maximum update depth', () => {
    const values$ = new Subject<{label: string}>()
    const {result, rerender, unmount} = renderHook(() =>
      useHook(values$, () => ({label: 'pending'})),
    )

    expect(result.current).toEqual({label: 'pending'})
    const first = result.current
    rerender()
    // Re-running the initializer would yield a new object, fail Object.is in
    // useSyncExternalStore, and loop until "Maximum update depth exceeded".
    expect(result.current).toBe(first)

    act(() => values$.next({label: 'emitted'}))
    expect(result.current).toEqual({label: 'emitted'})
    unmount()
  })
})

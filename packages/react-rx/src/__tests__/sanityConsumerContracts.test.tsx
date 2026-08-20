/**
 * Regression suite for the contracts `sanity-io/sanity` builds on top of this library.
 *
 * The fixtures below are vendored (lightly trimmed) from sanity's core utilities:
 *
 * - `useLoadable` / `asLoadable` — packages/sanity/src/core/util/useLoadable.ts
 * - `createHookFromObservableFactory` — packages/sanity/src/core/util/createHookFromObservableFactory.ts
 *
 * Their inline comments cite specific react-rx v5 semantics (identity-coherent deferral,
 * shared store subscription between `useObservable` and `useSyncObservable`, error-throw
 * timing from the live snapshot). If a change to react-rx breaks one of these tests, it
 * breaks sanity.
 */
import {act, render, waitFor} from '@testing-library/react'
import {Component, useMemo, type PropsWithChildren} from 'react'
import {
  catchError,
  concat,
  distinctUntilChanged,
  map,
  Observable,
  of,
  scan,
  Subject,
  switchMap,
  type OperatorFunction,
} from 'rxjs'
import {describe, expect, test, vi} from 'vitest'

import {useObservable} from '../useObservable'
import {useSyncObservable} from '../useSyncObservable'

const tick = () => new Promise((resolve) => setTimeout(resolve, 0))

// ---------------------------------------------------------------------------
// Vendored fixture: useLoadable (packages/sanity/src/core/util/useLoadable.ts)
// ---------------------------------------------------------------------------

interface LoadingState {
  value: undefined
  error: null
  isLoading: true
}

interface LoadedState<T> {
  value: T
  error: null
  isLoading: false
}

interface ErrorState {
  value: undefined
  error: Error
  isLoading: false
}

type LoadableState<T> = LoadingState | LoadedState<T> | ErrorState

const LOADING_STATE: LoadingState = {
  isLoading: true,
  value: undefined,
  error: null,
}

function asLoadable<T>(): OperatorFunction<T, LoadableState<T>> {
  return (value$: Observable<T>) =>
    value$.pipe(
      map((value) => ({isLoading: false, value, error: null}) as const),
      catchError((error): Observable<ErrorState> =>
        of({isLoading: false, value: undefined, error}),
      ),
    )
}

function useLoadable<T>(value$: Observable<T>, initialValue?: T): LoadableState<T | undefined> {
  const initial: LoadableState<T> =
    typeof initialValue === 'undefined'
      ? LOADING_STATE
      : {isLoading: false, value: initialValue, error: null}

  const loadableObservable = useMemo(() => value$.pipe(asLoadable()), [value$])
  // Sanity relies on react-rx v5's deferral being identity-coherent here: when callers
  // key `value$` on identities like a document id, the live loadable wins on an identity
  // change — the previous identity's loaded value never returns under the new one.
  return useObservable(loadableObservable, initial)
}

// ---------------------------------------------------------------------------
// Vendored fixture: createHookFromObservableFactory
// (packages/sanity/src/core/util/createHookFromObservableFactory.ts)
// ---------------------------------------------------------------------------

type LoadingTuple<T> = [T, boolean]

type ReactHook<TArgs, TResult> = (args: TArgs) => TResult

function createHookFromObservableFactory<T, TArg = void>(
  observableFactory: (arg: TArg) => Observable<T>,
  initialValue: T,
): ReactHook<TArg, LoadingTuple<T>>
function createHookFromObservableFactory<T, TArg = void>(
  observableFactory: (arg: TArg) => Observable<T>,
  initialValue?: T,
): ReactHook<TArg, LoadingTuple<T | undefined>>
function createHookFromObservableFactory<T, TArg = void>(
  observableFactory: (arg: TArg) => Observable<T>,
  initialValue?: T,
): ReactHook<TArg, LoadingTuple<T | undefined>> {
  const initialLoadingTuple: LoadingTuple<T | undefined> = [initialValue, true]
  const initialResult = {type: 'tuple', tuple: initialLoadingTuple} as const

  return function useLoadableFromCreateLoadable(arg: TArg) {
    const observable = useMemo(
      () =>
        of(arg).pipe(
          switchMap((_arg) =>
            concat(
              of({type: 'loading'} as const),
              observableFactory(_arg).pipe(map((value) => ({type: 'value', value}) as const)),
            ),
          ),
          scan(([prevValue], next): LoadingTuple<T | undefined> => {
            if (next.type === 'loading') return [prevValue, true]
            return [next.value, false]
          }, initialLoadingTuple),
          distinctUntilChanged(([prevValue, prevIsLoading], [nextValue, nextIsLoading]) => {
            if (prevValue !== nextValue) return false
            if (prevIsLoading !== nextIsLoading) return false
            return true
          }),
          map((tuple) => ({type: 'tuple', tuple}) as const),
          catchError((error) => of({type: 'error', error} as const)),
        ),
      [arg],
    )
    // Sanity defers the UI tuple: on an identity change (e.g. a new document id) the
    // identity-coherent deferral falls back to the new observable's live value — which
    // synchronously resets to the loading tuple — so the previous arg's value never
    // renders as loaded state for the new one.
    const result = useObservable(observable, initialResult)
    // Errors are thrown from the live snapshot so they reach the error boundary as soon
    // as the observable errors, instead of after the deferred value catches up. Both
    // hooks share one store subscription per observable, so this sync read costs no
    // extra subscription.
    const liveResult = useSyncObservable(observable, initialResult)

    if (liveResult.type === 'error') throw liveResult.error
    if (result.type === 'error') throw result.error

    return result.tuple
  }
}

// ---------------------------------------------------------------------------
// Shared test helpers
// ---------------------------------------------------------------------------

/**
 * Renders `null` once a child throws; reports every caught error via `onError`.
 * Mirrors how boundaries recover in the studio (the pane subtree remounts).
 */
class TestErrorBoundary extends Component<
  PropsWithChildren<{onError: (error: Error) => void}>,
  {hasError: boolean}
> {
  constructor(props: PropsWithChildren<{onError: (error: Error) => void}>) {
    super(props)
    this.state = {hasError: false}
  }
  static getDerivedStateFromError() {
    return {hasError: true}
  }
  override componentDidCatch(error: Error) {
    this.props.onError(error)
  }
  override render() {
    return this.state.hasError ? null : this.props.children
  }
}

// ---------------------------------------------------------------------------
// createHookFromObservableFactory contracts
// ---------------------------------------------------------------------------

describe('createHookFromObservableFactory (vendored from sanity)', () => {
  test('returns the loading tuple first, then the loaded tuple', async () => {
    const observableFactory = (value: string) =>
      new Observable<string>((subscriber) => {
        void tick().then(() => {
          subscriber.next(`hello, ${value}`)
          subscriber.complete()
        })
      })
    const useHook = createHookFromObservableFactory(observableFactory)

    const renderTimeline: LoadingTuple<string | undefined>[] = []
    const TestComponent = ({value}: {value: string}) => {
      renderTimeline.push(useHook(value))
      return null
    }
    render(<TestComponent value="world" />)

    expect(renderTimeline[0]).toEqual([undefined, true])
    await waitFor(() => expect(renderTimeline.at(-1)).toEqual(['hello, world', false]))
  })

  test('with an initial value the first tuple is [initialValue, true]', async () => {
    const observableFactory = vi.fn(
      (value: string) =>
        new Observable<string>((subscriber) => {
          void tick().then(() => {
            subscriber.next(`hello, ${value}`)
            subscriber.complete()
          })
        }),
    )
    const useHook = createHookFromObservableFactory(observableFactory, 'factory initial')

    const renderTimeline: LoadingTuple<string>[] = []
    const TestComponent = ({value}: {value: string}) => {
      renderTimeline.push(useHook(value))
      return null
    }
    render(<TestComponent value="world" />)

    expect(renderTimeline[0]).toEqual(['factory initial', true])
    await waitFor(() => expect(renderTimeline.at(-1)).toEqual(['hello, world', false]))
    // Still a single factory call (and thus source subscription) after the value arrived.
    expect(observableFactory).toHaveBeenCalledTimes(1)
  })

  test('arg change flips back to loading; the previous arg never renders as loaded under the new one', async () => {
    const observableFactory = vi.fn(
      (value: string) =>
        new Observable<{value: string}>((subscriber) => {
          void tick().then(() => {
            subscriber.next({value: `hello, ${value}`})
            subscriber.complete()
          })
        }),
    )
    const useHook = createHookFromObservableFactory(observableFactory)

    const renderTimeline: LoadingTuple<{value: string} | undefined>[] = []
    const TestComponent = ({value}: {value: string}) => {
      renderTimeline.push(useHook(value))
      return null
    }
    const {rerender} = render(<TestComponent value="world" />)

    expect(renderTimeline[0]).toEqual([undefined, true])
    await waitFor(() => expect(renderTimeline.at(-1)).toEqual([{value: 'hello, world'}, false]))
    // One factory call per distinct arg — react-rx@4.2.5 fixed a useObservable cache
    // leak that previously caused duplicate subscriptions (and thus double calls).
    expect(observableFactory).toHaveBeenCalledTimes(1)

    const timelineLengthBeforeArgChange = renderTimeline.length
    rerender(<TestComponent value="hooks" />)

    // The first render after the arg change must be the loading tuple: the deferred
    // snapshot belonging to the previous arg must never render as loaded state under
    // the new identity (identity-coherent deferral).
    expect(renderTimeline[timelineLengthBeforeArgChange]).toEqual([undefined, true])
    await waitFor(() => expect(renderTimeline.at(-1)).toEqual([{value: 'hello, hooks'}, false]))
    expect(renderTimeline.slice(timelineLengthBeforeArgChange)).not.toContainEqual([
      {value: 'hello, world'},
      false,
    ])
    expect(observableFactory).toHaveBeenCalledTimes(2)
  })

  test('the dual deferred + sync read costs a single source subscription', () => {
    let activeSubscriptions = 0
    let totalSubscriptions = 0
    const observableFactory = () =>
      new Observable<string>((subscriber) => {
        activeSubscriptions += 1
        totalSubscriptions += 1
        subscriber.next('value')
        return () => {
          activeSubscriptions -= 1
        }
      })
    const useHook = createHookFromObservableFactory(observableFactory)

    const TestComponent = () => {
      useHook()
      return null
    }
    const {rerender} = render(<TestComponent />)

    // `useObservable` and `useSyncObservable` share one store entry per observable —
    // the warm-up probe and both live subscriptions all reuse a single source
    // subscription.
    expect(activeSubscriptions).toBe(1)
    expect(totalSubscriptions).toBe(1)

    rerender(<TestComponent />)
    expect(activeSubscriptions).toBe(1)
    expect(totalSubscriptions).toBe(1)
  })

  test('throws from the live snapshot: no stale frame is committed between the error and the boundary', async () => {
    // The render that observes the error must throw immediately. If the throw were
    // moved to the deferred snapshot, the error render would first commit one more
    // frame with the stale (pre-error) tuple — deferred values lag one render behind —
    // and only the deferred catch-up render would throw. The frame count below is the
    // discriminating observation.
    const subject = new Subject<string>()
    const useHook = createHookFromObservableFactory(() => subject)

    const caughtErrors: Error[] = []
    const renderTimeline: LoadingTuple<string | undefined>[] = []
    const TestComponent = () => {
      renderTimeline.push(useHook())
      return null
    }
    render(
      <TestErrorBoundary onError={(error) => caughtErrors.push(error)}>
        <TestComponent />
      </TestErrorBoundary>,
      {onCaughtError: () => {}},
    )

    act(() => subject.next('value before error'))
    await waitFor(() => expect(renderTimeline.at(-1)).toEqual(['value before error', false]))

    const framesBeforeError = renderTimeline.length
    act(() => subject.error(new Error('live error')))

    await waitFor(() => expect(caughtErrors.map((error) => error.message)).toContain('live error'))
    // The erroring render threw before returning, so it committed no frame. A
    // deferred-side throw would have appended at least one more stale
    // `['value before error', false]` frame.
    expect(renderTimeline.length).toBe(framesBeforeError)
  })

  test('recovers after an errored arg: the new arg loads without re-throwing or leaking stale state', async () => {
    const subjects = new Map<string, Subject<string>>()
    const observableFactory = vi.fn((arg: string) => {
      if (!subjects.has(arg)) subjects.set(arg, new Subject<string>())
      return subjects.get(arg)!
    })
    const useHook = createHookFromObservableFactory(observableFactory)

    const caughtErrors: Error[] = []
    const renderTimeline: LoadingTuple<string | undefined>[] = []
    const TestComponent = ({value}: {value: string}) => {
      renderTimeline.push(useHook(value))
      return null
    }
    const view = render(
      <TestErrorBoundary key="a" onError={(error) => caughtErrors.push(error)}>
        <TestComponent value="a" />
      </TestErrorBoundary>,
      {onCaughtError: () => {}},
    )

    act(() => subjects.get('a')!.next('value for a'))
    await waitFor(() => expect(renderTimeline.at(-1)).toEqual(['value for a', false]))

    act(() => subjects.get('a')!.error(new Error('error for a')))
    await waitFor(() => expect(caughtErrors.map((error) => error.message)).toContain('error for a'))

    // Recovery: move on to arg "b". The boundary is keyed, so it remounts — the same
    // way studio boundaries recover when the pane subtree remounts.
    const framesBeforeRecovery = renderTimeline.length
    const catchesBeforeRecovery = caughtErrors.length
    view.rerender(
      <TestErrorBoundary key="b" onError={(error) => caughtErrors.push(error)}>
        <TestComponent value="b" />
      </TestErrorBoundary>,
    )
    act(() => subjects.get('b')!.next('value for b'))

    await waitFor(() => expect(renderTimeline.at(-1)).toEqual(['value for b', false]))
    const framesAfterRecovery = renderTimeline.slice(framesBeforeRecovery)
    // The recovery starts from b's own loading state and never renders the errored
    // arg's data again.
    expect(framesAfterRecovery[0]).toEqual([undefined, true])
    expect(framesAfterRecovery).not.toContainEqual(['value for a', false])
    // The stale error was not re-thrown into the boundary after recovery.
    expect(caughtErrors.length).toBe(catchesBeforeRecovery)
  })
})

// ---------------------------------------------------------------------------
// useLoadable contracts
// ---------------------------------------------------------------------------

describe('useLoadable (vendored from sanity)', () => {
  test('starts loading and flips to the loaded state', () => {
    const subject = new Subject<string>()

    const renderTimeline: LoadableState<string | undefined>[] = []
    const TestComponent = ({value$}: {value$: Observable<string>}) => {
      renderTimeline.push(useLoadable(value$))
      return null
    }
    render(<TestComponent value$={subject} />)

    expect(renderTimeline[0]).toEqual(LOADING_STATE)

    act(() => subject.next('loaded value'))
    expect(renderTimeline.at(-1)).toEqual({isLoading: false, value: 'loaded value', error: null})
  })

  test('an initialValue starts as already-loaded state', () => {
    const subject = new Subject<string>()

    const renderTimeline: LoadableState<string | undefined>[] = []
    const TestComponent = ({value$}: {value$: Observable<string>}) => {
      renderTimeline.push(useLoadable(value$, 'from cache'))
      return null
    }
    render(<TestComponent value$={subject} />)

    expect(renderTimeline[0]).toEqual({isLoading: false, value: 'from cache', error: null})

    act(() => subject.next('fresh value'))
    expect(renderTimeline.at(-1)).toEqual({isLoading: false, value: 'fresh value', error: null})
  })

  test('errors become error-state values via catchError — the hook never throws', () => {
    const subject = new Subject<string>()

    const renderTimeline: LoadableState<string | undefined>[] = []
    const TestComponent = ({value$}: {value$: Observable<string>}) => {
      renderTimeline.push(useLoadable(value$))
      return null
    }
    render(<TestComponent value$={subject} />)

    expect(() => {
      act(() => subject.error(new Error('fetch failed')))
    }).not.toThrow()

    expect(renderTimeline.at(-1)).toEqual({
      isLoading: false,
      value: undefined,
      error: new Error('fetch failed'),
    })
  })

  test('identity change: the previous identity’s loaded value never renders under the new one', () => {
    // Callers key `value$` on identities like a document id (e.g. useDocumentValues).
    const docA = new Subject<string>()
    const docB = new Subject<string>()

    const renderTimeline: LoadableState<string | undefined>[] = []
    const TestComponent = ({value$}: {value$: Observable<string>}) => {
      renderTimeline.push(useLoadable(value$))
      return null
    }
    const {rerender} = render(<TestComponent value$={docA} />)

    act(() => docA.next('value for a'))
    expect(renderTimeline.at(-1)).toEqual({isLoading: false, value: 'value for a', error: null})

    const timelineLengthBeforeSwitch = renderTimeline.length
    rerender(<TestComponent value$={docB} />)

    // The render right after the identity change must be the new stream's live state
    // (loading — docB has not emitted), never the deferred snapshot belonging to docA.
    expect(renderTimeline[timelineLengthBeforeSwitch]).toEqual(LOADING_STATE)
    expect(renderTimeline.slice(timelineLengthBeforeSwitch)).not.toContainEqual({
      isLoading: false,
      value: 'value for a',
      error: null,
    })

    act(() => docB.next('value for b'))
    expect(renderTimeline.at(-1)).toEqual({isLoading: false, value: 'value for b', error: null})
  })
})

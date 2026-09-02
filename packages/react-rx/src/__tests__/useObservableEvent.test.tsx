/* oxlint-disable typescript/no-deprecated -- exercises the v6 surface that v7 removes */
import {act, fireEvent, render, renderHook, screen} from '@testing-library/react'
import {memo, useCallback, useEffect, useState, type ChangeEvent} from 'react'
import {
  catchError,
  concat,
  config,
  debounce,
  filter,
  map,
  Observable,
  of,
  scan,
  Subject,
  switchMap,
  tap,
  timer,
} from 'rxjs'
import {expect, test} from 'vitest'

import {useObservableEvent} from '../useObservableEvent'

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

test('returns a referentially stable callback across re-renders', () => {
  const {result, rerender} = renderHook(() =>
    useObservableEvent((events$: Observable<string>) => events$),
  )
  const first = result.current
  rerender()
  rerender()
  expect(result.current).toBe(first)
})

test('events flow through the pipeline in call order', () => {
  const seen: number[] = []
  const {result} = renderHook(() =>
    useObservableEvent((events$: Observable<number>) =>
      events$.pipe(
        map((n) => n * 2),
        tap((n) => seen.push(n)),
      ),
    ),
  )

  act(() => {
    result.current(1)
    result.current(2)
    result.current(3)
  })
  expect(seen).toEqual([2, 4, 6])
})

test('builds the pipeline once: re-renders with new handler closures neither re-subscribe nor reset stream state', () => {
  const handlerBuilds: number[] = []
  const totals: number[] = []
  const {result, rerender} = renderHook(() =>
    // A new handler closure is passed on every render — the sanity codebase always
    // passes inline arrows (e.g. DocumentListPane) and relies on the pipeline being
    // built exactly once so debounce timers and scan accumulators survive re-renders.
    useObservableEvent((events$: Observable<number>) => {
      handlerBuilds.push(handlerBuilds.length)
      return events$.pipe(
        scan((total, n) => total + n, 0),
        tap((total) => totals.push(total)),
      )
    }),
  )

  expect(handlerBuilds).toHaveLength(1)

  act(() => result.current(1))
  rerender()
  rerender()
  expect(handlerBuilds).toHaveLength(1)

  act(() => result.current(2))
  // The scan accumulator kept its state across the re-renders.
  expect(totals).toEqual([1, 3])
})

test('operator closures are captured when the pipeline is built on mount, not per event', () => {
  // Documented semantics: values captured *inside* operators freeze at subscribe time.
  // Per-event freshness must come from the event value itself or stable stores/refs —
  // which is why sanity's handlers only close over stable setState functions.
  const seen: number[] = []
  const {result, rerender} = renderHook(
    ({factor}: {factor: number}) =>
      useObservableEvent((events$: Observable<number>) =>
        events$.pipe(
          map((n) => n * factor),
          tap((n) => seen.push(n)),
        ),
      ),
    {initialProps: {factor: 2}},
  )

  act(() => result.current(1))
  expect(seen).toEqual([2])

  rerender({factor: 10})
  act(() => result.current(1))
  // Still the mount-time factor.
  expect(seen).toEqual([2, 2])
})

/** Kept at module scope with the sink passed as a prop so the React Compiler captures it correctly. */
const LabelFireButton = memo(function LabelFireButton({
  label,
  seen,
}: {
  label: string
  seen: string[]
}) {
  const fire = useObservableEvent((events$: Observable<string>) =>
    events$.pipe(tap((value) => seen.push(value))),
  )
  return (
    <button type="button" onClick={() => fire(label)}>
      fire
    </button>
  )
})

test('event values carry the latest render data even though operator closures are frozen', () => {
  // The complement of the frozen-closure test: per-event data should be passed as the
  // event value. DOM handlers close over the latest render, so this stays fresh.
  const seen: string[] = []

  const {rerender} = render(<LabelFireButton label="a" seen={seen} />)
  fireEvent.click(screen.getByRole('button', {name: 'fire'}))

  rerender(<LabelFireButton label="b" seen={seen} />)
  fireEvent.click(screen.getByRole('button', {name: 'fire'}))

  expect(seen).toEqual(['a', 'b'])
})

test('subscribes on mount and unsubscribes on unmount', () => {
  const lifecycle: string[] = []
  const {unmount} = renderHook(() =>
    useObservableEvent((events$: Observable<string>) =>
      events$.pipe(
        tap({
          subscribe: () => lifecycle.push('subscribe'),
          unsubscribe: () => lifecycle.push('unsubscribe'),
        }),
      ),
    ),
  )

  expect(lifecycle).toEqual(['subscribe'])
  unmount()
  expect(lifecycle).toEqual(['subscribe', 'unsubscribe'])
})

test('events fired after unmount are silently dropped', () => {
  const seen: string[] = []
  const {result, unmount} = renderHook(() =>
    useObservableEvent((events$: Observable<string>) =>
      events$.pipe(tap((value) => seen.push(value))),
    ),
  )

  act(() => result.current('before'))
  expect(seen).toEqual(['before'])

  unmount()
  // The callback itself stays callable — it just has no subscriber anymore.
  expect(() => result.current('after')).not.toThrow()
  expect(seen).toEqual(['before'])
})

function FireOnMountChild({fire}: {fire: () => void}) {
  useEffect(() => {
    fire()
  }, [fire])
  return null
}

/** Kept at module scope with the sink passed as a prop so the React Compiler captures it correctly. */
function FireOnMountParent({seen}: {seen: string[]}) {
  const call = useObservableEvent((events$: Observable<string>) =>
    events$.pipe(tap((value) => seen.push(value))),
  )
  const fireFromChildMount = useCallback(() => call('from-child-mount-effect'), [call])
  return (
    <>
      <FireOnMountChild fire={fireFromChildMount} />
      <button type="button" onClick={() => call('from-click')}>
        fire
      </button>
    </>
  )
}

test('events fired before the subscription effect runs are dropped (hot Subject, no replay)', () => {
  // Child effects run before the parent's, so an event fired from a child's mount
  // effect happens before useObservableEvent's own effect has subscribed. This is why
  // sanity only fires these callbacks from user events, never from mount effects.
  const seen: string[] = []

  render(<FireOnMountParent seen={seen} />)
  expect(seen).toEqual([])

  fireEvent.click(screen.getByRole('button', {name: 'fire'}))
  expect(seen).toEqual(['from-click'])
})

const makeAccumulatorHook = (seen: number[]) => () =>
  useObservableEvent((events$: Observable<number>) =>
    events$.pipe(
      scan((total, n) => total + n, 0),
      tap((total) => seen.push(total)),
    ),
  )

test('each hook instance gets its own isolated stream', () => {
  const seenA: number[] = []
  const seenB: number[] = []
  const hookA = renderHook(makeAccumulatorHook(seenA))
  const hookB = renderHook(makeAccumulatorHook(seenB))

  act(() => hookA.result.current(1))
  act(() => hookB.result.current(10))
  act(() => hookA.result.current(2))

  // Independent scan accumulators — events never cross instances.
  expect(seenA).toEqual([1, 3])
  expect(seenB).toEqual([10])
})

test('a pipeline error terminates the stream: later events are dropped and the error is reported as unhandled', async () => {
  const seen: string[] = []
  const unhandled: unknown[] = []
  const originalOnUnhandledError = config.onUnhandledError
  config.onUnhandledError = (error) => unhandled.push(error)

  try {
    const {result} = renderHook(() =>
      useObservableEvent((events$: Observable<string>) =>
        events$.pipe(
          map((value) => {
            if (value === 'boom') {
              throw new Error('boom')
            }
            return value
          }),
          tap((value) => seen.push(value)),
        ),
      ),
    )

    act(() => result.current('ok'))
    expect(seen).toEqual(['ok'])

    // The subscription has no error handler, so the error tears the pipeline down.
    act(() => result.current('boom'))
    act(() => result.current('after-error'))
    expect(seen).toEqual(['ok'])

    // RxJS reports errors from handler-less subscriptions asynchronously.
    await act(async () => {
      await wait(0)
    })
    expect(unhandled).toEqual([new Error('boom')])
  } finally {
    config.onUnhandledError = originalOnUnhandledError
  }
})

test('catchError on the inner observable keeps the event stream alive', () => {
  // The recommended pattern (and what sanity's reference inputs do): recover per
  // request inside switchMap so one failed search does not kill the pipeline.
  const seen: string[] = []
  const {result} = renderHook(() =>
    useObservableEvent((events$: Observable<string>) =>
      events$.pipe(
        switchMap((value) =>
          of(value).pipe(
            map((v) => {
              if (v === 'fail') {
                throw new Error('request failed')
              }
              return `ok:${v}`
            }),
            catchError(() => of('recovered')),
          ),
        ),
        tap((value) => seen.push(value)),
      ),
    ),
  )

  act(() => result.current('a'))
  act(() => result.current('fail'))
  act(() => result.current('b'))

  expect(seen).toEqual(['ok:a', 'recovered', 'ok:b'])
})

/**
 * Mirrors `DocumentListPane` in sanity
 * (packages/sanity/src/structure/panes/documentList/DocumentListPane.tsx): a controlled
 * search input whose rendered value updates on every keystroke while the query only
 * settles after a debounce — except clearing, which bypasses the debounce via `of('')`.
 */
const SEARCH_DEBOUNCE_MS = 25

function SearchPane({queryLog}: {queryLog: string[]}) {
  const [searchInputValue, setSearchInputValue] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  const handleQueryChange = useObservableEvent(
    (event$: Observable<ChangeEvent<HTMLInputElement>>) => {
      return event$.pipe(
        map((event) => event.target.value),
        tap((value) => setSearchInputValue(value)),
        debounce((value) => (value === '' ? of('') : timer(SEARCH_DEBOUNCE_MS))),
        tap((value) => {
          queryLog.push(value)
          setSearchQuery(value)
        }),
      )
    },
  )

  return (
    <>
      <input data-testid="search-input" value={searchInputValue} onChange={handleQueryChange} />
      <output data-testid="search-query">{searchQuery}</output>
    </>
  )
}

function typeSearchValue(value: string) {
  fireEvent.change(screen.getByTestId('search-input'), {target: {value}})
}

test('controlled search input: keystrokes update the input immediately, the query only after the debounce settles', async () => {
  const queryLog: string[] = []
  render(<SearchPane queryLog={queryLog} />)
  const input = screen.getByTestId<HTMLInputElement>('search-input')

  typeSearchValue('d')
  typeSearchValue('do')
  typeSearchValue('doc')

  // tap(setSearchInputValue) runs synchronously per keystroke — the controlled input
  // never lags, which is the whole point of the immediate/debounced split.
  expect(input.value).toBe('doc')
  expect(screen.getByTestId('search-query').textContent).toBe('')

  await act(async () => {
    await wait(SEARCH_DEBOUNCE_MS * 4)
  })
  // Only the settled value ever reached the query — no intermediate keystrokes.
  expect(screen.getByTestId('search-query').textContent).toBe('doc')
  expect(queryLog).toEqual(['doc'])
})

test('controlled search input: typing again during the debounce window restarts it', async () => {
  const queryLog: string[] = []
  render(<SearchPane queryLog={queryLog} />)

  typeSearchValue('d')
  await act(async () => {
    // Less than the debounce window, so 'd' never settles.
    await wait(5)
  })
  typeSearchValue('do')
  await act(async () => {
    await wait(SEARCH_DEBOUNCE_MS * 4)
  })

  expect(queryLog).toEqual(['do'])
  expect(screen.getByTestId('search-query').textContent).toBe('do')
})

test('controlled search input: clearing bypasses the debounce and resets the query synchronously', async () => {
  const queryLog: string[] = []
  render(<SearchPane queryLog={queryLog} />)
  const input = screen.getByTestId<HTMLInputElement>('search-input')

  typeSearchValue('doc')
  await act(async () => {
    await wait(SEARCH_DEBOUNCE_MS * 4)
  })
  expect(screen.getByTestId('search-query').textContent).toBe('doc')

  // `debounce(() => of(''))` emits synchronously, so the reset applies inside the
  // change event itself — no waiting.
  typeSearchValue('')
  expect(input.value).toBe('')
  expect(screen.getByTestId('search-query').textContent).toBe('')
  expect(queryLog).toEqual(['doc', ''])
})

/**
 * Mirrors `ReferenceInput` in sanity
 * (packages/sanity/src/core/form/inputs/ReferenceInput/ReferenceInput.tsx): search terms
 * are switchMapped into a loading notification plus an async request, folded into a
 * single search state via scan, with per-request error recovery.
 */
interface ReferenceSearchState {
  hits: string[]
  searchString?: string
  isLoading: boolean
}

const INITIAL_SEARCH_STATE: ReferenceSearchState = {
  hits: [],
  isLoading: false,
}

function nonNullable<T>(value: T): value is NonNullable<T> {
  return value !== null
}

function useReferenceSearch(onSearch: (searchString: string) => Observable<string[]>) {
  const [searchState, setSearchState] = useState(INITIAL_SEARCH_STATE)

  const onQueryChange = useObservableEvent((inputValue$: Observable<string | null>) => {
    return inputValue$.pipe(
      filter(nonNullable),
      switchMap((searchString) =>
        concat(
          of({isLoading: true}),
          onSearch(searchString).pipe(
            map((hits) => ({hits, searchString, isLoading: false})),
            catchError(() => of({hits: [], searchString, isLoading: false})),
          ),
        ),
      ),
      scan(
        (prevState, nextState): ReferenceSearchState => ({...prevState, ...nextState}),
        INITIAL_SEARCH_STATE,
      ),
      tap(setSearchState),
    )
  })

  return {searchState, onQueryChange}
}

test('reference autocomplete: a newer search cancels the in-flight one (switchMap) and scan folds the state', () => {
  const requests = new Map<string, Subject<string[]>>()
  const requestLog: string[] = []
  const onSearch = (searchString: string) =>
    new Observable<string[]>((subscriber) => {
      requestLog.push(`subscribe:${searchString}`)
      const response = new Subject<string[]>()
      requests.set(searchString, response)
      const subscription = response.subscribe(subscriber)
      return () => {
        requestLog.push(`teardown:${searchString}`)
        subscription.unsubscribe()
      }
    })

  const {result} = renderHook(() => useReferenceSearch(onSearch))
  expect(result.current.searchState).toEqual(INITIAL_SEARCH_STATE)

  // `filter(nonNullable)` ignores cleared inputs.
  act(() => result.current.onQueryChange(null))
  expect(result.current.searchState).toEqual(INITIAL_SEARCH_STATE)
  expect(requestLog).toEqual([])

  act(() => result.current.onQueryChange('foo'))
  expect(result.current.searchState).toEqual({hits: [], isLoading: true})
  expect(requestLog).toEqual(['subscribe:foo'])

  // A newer term while 'foo' is in flight: switchMap tears 'foo' down.
  act(() => result.current.onQueryChange('bar'))
  expect(requestLog).toEqual(['subscribe:foo', 'teardown:foo', 'subscribe:bar'])
  expect(result.current.searchState.isLoading).toBe(true)

  // A late response for the cancelled request must not surface.
  act(() => {
    requests.get('foo')!.next(['foo-hit'])
  })
  expect(result.current.searchState.hits).toEqual([])

  act(() => {
    requests.get('bar')!.next(['bar-hit-1', 'bar-hit-2'])
    requests.get('bar')!.complete()
  })
  expect(result.current.searchState).toEqual({
    hits: ['bar-hit-1', 'bar-hit-2'],
    searchString: 'bar',
    isLoading: false,
  })
})

const flakySearch = (searchString: string) =>
  searchString === 'fail'
    ? new Observable<string[]>((subscriber) =>
        subscriber.error(new Error(`search failed: ${searchString}`)),
      )
    : of([`hit-for-${searchString}`])

test('reference autocomplete: a failed search recovers to empty hits and later searches still work', () => {
  const {result} = renderHook(() => useReferenceSearch(flakySearch))

  act(() => result.current.onQueryChange('fail'))
  expect(result.current.searchState).toEqual({hits: [], searchString: 'fail', isLoading: false})

  // The inner catchError kept the outer event stream alive.
  act(() => result.current.onQueryChange('ok'))
  expect(result.current.searchState).toEqual({
    hits: ['hit-for-ok'],
    searchString: 'ok',
    isLoading: false,
  })
})

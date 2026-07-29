import {act, render, screen} from '@testing-library/react'
import {
  Suspense,
  use,
  useDeferredValue,
  useState,
  useTransition,
  type ReactNode,
} from 'react'
import {BehaviorSubject} from 'rxjs'
import {expect, test} from 'vitest'

import {useObservablePromise} from '../useObservablePromise'

/**
 * Port of the dai-shi concurrent-rendering tearing checks relevant to external
 * stores, adapted to vitest/jsdom.
 *
 * External-store libraries (react-rxjs, zustand, redux, this hook) pass the
 * "no tearing finally" checks and generally cannot support interrupt/branching
 * (time slicing / wip state) — those require React-managed state. We assert the
 * tearing checks and document interrupt/branching as out of scope.
 *
 * @see https://github.com/dai-shi/will-this-react-global-state-work-in-concurrent-rendering
 */

const COUNTERS = 20

async function renderAsync(ui: ReactNode) {
  let result!: ReturnType<typeof render>
  await act(async () => {
    result = render(ui)
  })
  return result
}

function slowFib(n: number): number {
  if (n <= 1) return n
  return slowFib(n - 1) + slowFib(n - 2)
}

function Counter({
  count$,
  index,
  waste = 18,
}: {
  count$: BehaviorSubject<number>
  index: number
  waste?: number
}) {
  const value = use(useObservablePromise(count$))
  // Artificial expensive render to widen the concurrent window.
  slowFib(waste)
  return <span data-testid={`c-${index}`}>{value}</span>
}

function readAll(): number[] {
  return Array.from({length: COUNTERS}, (_, i) =>
    Number(screen.getByTestId(`c-${i}`).textContent),
  )
}

test('no tearing finally on update (startTransition)', async () => {
  const count$ = new BehaviorSubject(0)

  function App() {
    const [, startTransition] = useTransition()
    const [local, setLocal] = useState(0)
    return (
      <>
        <button
          type="button"
          onClick={() => {
            count$.next(count$.value + 1)
            startTransition(() => setLocal((n) => n + 1))
          }}
        >
          inc
        </button>
        <span data-testid="local">{local}</span>
        <Suspense fallback={<div>loading</div>}>
          {Array.from({length: COUNTERS}, (_, i) => (
            <Counter key={i} count$={count$} index={i} />
          ))}
        </Suspense>
      </>
    )
  }

  await renderAsync(<App />)
  expect(new Set(readAll()).size).toBe(1)

  await act(async () => {
    screen.getByRole('button', {name: 'inc'}).click()
  })

  const values = readAll()
  expect(new Set(values).size).toBe(1)
  expect(values[0]).toBe(1)
})

test('no tearing finally on mount (startTransition)', async () => {
  const count$ = new BehaviorSubject(0)

  function App() {
    const [mounted, setMounted] = useState(false)
    const [, startTransition] = useTransition()
    return (
      <>
        <button
          type="button"
          onClick={() => {
            count$.next(1)
            startTransition(() => setMounted(true))
          }}
        >
          mount
        </button>
        <Suspense fallback={<div>loading</div>}>
          {mounted &&
            Array.from({length: COUNTERS}, (_, i) => (
              <Counter key={i} count$={count$} index={i} />
            ))}
        </Suspense>
      </>
    )
  }

  await renderAsync(<App />)
  await act(async () => {
    screen.getByRole('button', {name: 'mount'}).click()
  })

  await act(async () => {
    await Promise.resolve()
  })

  const values = readAll()
  expect(values).toHaveLength(COUNTERS)
  expect(new Set(values).size).toBe(1)
  expect(values[0]).toBe(1)
})

test('no tearing finally on update (useDeferredValue)', async () => {
  const count$ = new BehaviorSubject(0)

  function App() {
    const [version, setVersion] = useState(0)
    const deferred = useDeferredValue(version)
    return (
      <>
        <button
          type="button"
          onClick={() => {
            count$.next(count$.value + 1)
            setVersion((v) => v + 1)
          }}
        >
          inc
        </button>
        <span data-testid="deferred">{deferred}</span>
        <Suspense fallback={<div>loading</div>}>
          {Array.from({length: COUNTERS}, (_, i) => (
            <Counter key={i} count$={count$} index={i} />
          ))}
        </Suspense>
      </>
    )
  }

  await renderAsync(<App />)
  await act(async () => {
    screen.getByRole('button', {name: 'inc'}).click()
  })

  const values = readAll()
  expect(new Set(values).size).toBe(1)
  expect(values[0]).toBe(1)
})

test('no tearing finally on mount (useDeferredValue)', async () => {
  const count$ = new BehaviorSubject(0)

  function App() {
    const [mounted, setMounted] = useState(false)
    const deferredMounted = useDeferredValue(mounted)
    return (
      <>
        <button
          type="button"
          onClick={() => {
            count$.next(1)
            setMounted(true)
          }}
        >
          mount
        </button>
        <Suspense fallback={<div>loading</div>}>
          {deferredMounted &&
            Array.from({length: COUNTERS}, (_, i) => (
              <Counter key={i} count$={count$} index={i} />
            ))}
        </Suspense>
      </>
    )
  }

  await renderAsync(<App />)
  await act(async () => {
    screen.getByRole('button', {name: 'mount'}).click()
  })
  await act(async () => {
    await Promise.resolve()
  })

  const values = readAll()
  expect(values).toHaveLength(COUNTERS)
  expect(new Set(values).size).toBe(1)
  expect(values[0]).toBe(1)
})

/*
 * Interrupt (time slicing) and branching (wip state) are not supported for
 * external-store subscriptions — the same profile as react-rxjs / zustand /
 * redux in the dai-shi harness. Not asserted here.
 */

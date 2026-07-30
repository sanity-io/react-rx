import {act, render, screen} from '@testing-library/react'
import {
  memo,
  Suspense,
  use,
  useDeferredValue,
  useState,
  useTransition,
  type ReactNode,
} from 'react'
import {createRoot} from 'react-dom/client'
import {BehaviorSubject} from 'rxjs'
import {expect, test} from 'vitest'

import {useObservablePromise, type ObservablePromise} from '../useObservablePromise'

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
 * DIRECT external-store reads — the same profile as react-rxjs / zustand /
 * redux in the dai-shi harness: the uSES re-render triggered by an emission is
 * scheduled at sync priority. The test below proves the supported userland
 * escape hatch: `useDeferredValue(promise)` + `memo` moves expensive
 * re-renders onto the deferred lane, which IS time-sliced and interruptible.
 * Branching/wip-state semantics remain out of scope.
 */

const SLOW_ITEMS = 25

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function until(predicate: () => boolean, timeoutMs = 5000, intervalMs = 10): Promise<void> {
  const start = performance.now()
  while (!predicate()) {
    if (performance.now() - start > timeoutMs) {
      throw new Error('Timed out waiting for condition')
    }
    // oxlint-disable-next-line no-await-in-loop -- deliberate polling
    await wait(intervalMs)
  }
}

/** Find the fib(n) whose computation takes at least `targetMs` on this machine. */
function calibrateWaste(targetMs: number): number {
  for (let n = 18; n < 30; n++) {
    const start = performance.now()
    slowFib(n)
    if (performance.now() - start >= targetMs) {
      return n
    }
  }
  return 30
}

function SlowItem({promise, waste}: {promise: ObservablePromise<number>; waste: number}) {
  const value = use(promise)
  slowFib(waste)
  return <i>{value}</i>
}

// `memo` is load-bearing (per react.dev's useDeferredValue guidance): without
// it the sync store pass would re-render the slow items anyway (with the old
// promise), defeating the deferral.
const SlowList = memo(function SlowList({
  promise,
  waste,
}: {
  promise: ObservablePromise<number>
  waste: number
}) {
  return (
    <span data-testid="slow">
      {Array.from({length: SLOW_ITEMS}, (_, i) => (
        <SlowItem key={i} promise={promise} waste={waste} />
      ))}
    </span>
  )
})

function DeferredSection({promise, waste}: {promise: ObservablePromise<number>; waste: number}) {
  const deferred = useDeferredValue(promise)
  return <SlowList promise={deferred} waste={waste} />
}

function InterruptibleApp({count$, waste}: {count$: BehaviorSubject<number>; waste: number}) {
  const promise = useObservablePromise(count$)
  const immediate = use(promise)
  const [urgent, setUrgent] = useState(0)
  return (
    <>
      <button type="button" onClick={() => setUrgent((n) => n + 1)}>
        urgent
      </button>
      <span data-testid="immediate">{immediate}</span>
      <span data-testid="urgent">{urgent}</span>
      <DeferredSection promise={promise} waste={waste} />
    </>
  )
}

test('userland useDeferredValue(promise) restores time slicing for emission-driven updates', async () => {
  // ≥4ms per item × 25 items ⇒ ≥100ms of deferred render work, sliced into
  // many ~5ms scheduler chunks with yields in between.
  const waste = calibrateWaste(4)
  const count$ = new BehaviorSubject(0)

  // act() flushes sync and deferred work together, hiding exactly the
  // interleaving this test observes — so run without the act environment,
  // driving a manual createRoot and sampling the DOM between event-loop turns.
  const actEnv = globalThis as {IS_REACT_ACT_ENVIRONMENT?: boolean}
  const prevActEnv = actEnv.IS_REACT_ACT_ENVIRONMENT
  actEnv.IS_REACT_ACT_ENVIRONMENT = false
  const container = document.body.appendChild(document.createElement('div'))
  const root = createRoot(container)
  const read = (id: string) => container.querySelector(`[data-testid="${id}"]`)?.textContent

  try {
    root.render(<InterruptibleApp count$={count$} waste={waste} />)
    await until(() => read('slow') === '0'.repeat(SLOW_ITEMS))
    expect(read('immediate')).toBe('0')

    // An emission from outside React: the uSES notification renders the app at
    // sync priority (flushed in React's next immediate task), but
    // useDeferredValue keeps the memoized slow subtree on the OLD promise —
    // the expensive re-render is spawned on the deferred lane instead. Poll
    // for the sync commit; at the first moment it is observable, the ≥100ms
    // deferred pass cannot have committed, and both reads below happen in the
    // same JS turn, which rendering cannot interleave.
    count$.next(1)
    await until(() => read('immediate') === '1', 2000, 5)
    expect(read('slow')).toBe('0'.repeat(SLOW_ITEMS))

    // Let the deferred render chew through a few 5ms slices, then interrupt it
    // with an urgent update. This timer firing at all — and the click handler
    // running — already proves the deferred render yields to the event loop
    // (jsdom is single-threaded); the urgent commit landing while the slow
    // subtree still shows old values proves it preempts the deferred pass.
    await wait(10)
    expect(read('slow')).toBe('0'.repeat(SLOW_ITEMS))
    container.querySelector('button')!.dispatchEvent(new MouseEvent('click', {bubbles: true}))
    await until(() => read('urgent') === '1', 2000, 5)
    expect(read('slow')).toBe('0'.repeat(SLOW_ITEMS))

    // The interrupted deferred render restarts and converges to the emission.
    await until(() => read('slow') === '1'.repeat(SLOW_ITEMS))
    expect(read('immediate')).toBe('1')
    expect(read('urgent')).toBe('1')
  } finally {
    actEnv.IS_REACT_ACT_ENVIRONMENT = prevActEnv
    root.unmount()
    container.remove()
  }
})

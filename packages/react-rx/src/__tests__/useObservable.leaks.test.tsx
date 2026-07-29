import {act, render} from '@testing-library/react'
import {renderToString} from 'react-dom/server'
import {defer, Observable, of, throwError, timer} from 'rxjs'
import {map} from 'rxjs/operators'
import {expect, test} from 'vitest'

import {useObservable} from '../useObservable'

/**
 * Regression tests: `useObservable` keeps a module-level `WeakMap<Observable, CacheRecord>` where each
 * record retains the last snapshot (or error) produced by the source. Records are only ever removed by
 * `finalize(() => cache.delete(observable))` in the piped observable.
 *
 * The eager subscription inside `useMemo` used to run BEFORE `cache.set(observable, entry)`. For sources
 * that terminate (complete or error) synchronously upon subscription, `finalize` fired during that eager
 * subscription — while the entry was not yet in the cache — so the delete was a no-op and the entry was
 * inserted right after, with nothing left to evict it. A later committed mount would re-trigger teardown
 * through its store subscription and clean the entry up, but that never happens for server renders,
 * disabled hooks (which still warm up via the eager subscribe, but never establish a store subscription),
 * or renders that throw before commit (synchronously erroring sources). In those cases the entry retained
 * the last snapshot/error for as long as the source observable object itself stayed alive, and a
 * poisoned entry replayed its stale error on later mounts instead of re-subscribing.
 */

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

async function forceGC() {
  // Exposed by `--expose-gc`, passed to the worker processes via `execArgv` in vitest.config.ts.
  const {gc} = globalThis as {gc?: () => void}
  if (typeof gc !== 'function') {
    throw new TypeError(
      'Expected `globalThis.gc` to be available — is `--expose-gc` missing from `execArgv` in vitest.config.ts?',
    )
  }
  // A WeakRef target is kept alive until the end of the job it was created/dereferenced in, and a single
  // pass isn't always enough to collect the whole graph, so yield to the macrotask queue between passes.
  for (let i = 0; i < 5; i++) {
    // oxlint-disable-next-line no-await-in-loop -- GC passes must run sequentially
    await wait(0)
    gc()
  }
}

test('releases the last snapshot of a synchronously completing observable used by a disabled hook', async () => {
  let snapshotRef: WeakRef<object> | undefined
  // Long-lived source, as if declared at module scope in an app. It emits a fresh object per
  // subscription and completes synchronously (like a replayed+completed cache observable would).
  const source = defer(() => {
    const snapshot = {payload: 'x'.repeat(1024)}
    snapshotRef = new WeakRef(snapshot)
    return of(snapshot)
  })

  function ObservableComponent() {
    useObservable(source, undefined, {disabled: true})
    return null
  }

  const {unmount} = render(<ObservableComponent />)
  unmount()

  await forceGC()

  // While disabled, the hook still performs its eager render-phase warm-up subscription (disabled only
  // pauses the live store subscription), but nothing re-triggers teardown after that — so the entry
  // created during render must already have been evicted, releasing the snapshot.
  expect(snapshotRef!.deref()).toBeUndefined()
  // Keep the source — the WeakMap key — strongly reachable across the GC above, so the snapshot can
  // only have been released through eviction, not by the key getting collected.
  expect(source).toBeInstanceOf(Observable)
})

test('releases the last snapshot of a synchronously completing observable after server-side rendering', async () => {
  let snapshotRef: WeakRef<object> | undefined
  const source = defer(() => {
    const snapshot = {payload: 'x'.repeat(1024)}
    snapshotRef = new WeakRef(snapshot)
    return of(snapshot)
  })

  function ObservableComponent() {
    useObservable(source, 'server value')
    return null
  }

  // On the server there is no commit phase and no store subscription, only the eager subscription made
  // during render — the cache entry must not outlive it, or every unique observable rendered by a
  // long-lived server process would keep its last snapshot alive.
  renderToString(<ObservableComponent />)

  await forceGC()

  expect(snapshotRef!.deref()).toBeUndefined()
  // Keep the source — the WeakMap key — strongly reachable across the GC above, so the snapshot can
  // only have been released through eviction, not by the key getting collected.
  expect(source).toBeInstanceOf(Observable)
})

test('re-subscribes a synchronously erroring observable on a later mount instead of replaying a stale error', async () => {
  let shouldFail = true
  let subscriptions = 0
  const source = defer(() => {
    subscriptions++
    return shouldFail ? throwError(() => new Error('transient error')) : of('recovered')
  })

  function ObservableComponent() {
    return <>{useObservable(source, 'initial')}</>
  }

  // First mount: the source errors synchronously during the eager render-phase subscription, so the
  // render throws before commit and no store subscription ever runs that could clean up the cache
  // entry created for the errored source. The source keeps failing for the whole mount, which keeps
  // the test agnostic to how many render attempts React makes before surfacing the error.
  expect(() => render(<ObservableComponent />)).toThrow('transient error')
  const failedSubscriptions = subscriptions
  expect(failedSubscriptions).toBeGreaterThan(0)

  // Give any pending grace-period timers a chance to run, then let the upstream failure resolve.
  await wait(10)
  shouldFail = false

  // A later mount in the same runtime must re-subscribe the source (which has recovered) instead of
  // a leftover cache entry replaying the stale error and turning the transient failure permanent.
  const {container} = render(<ObservableComponent />)
  expect(subscriptions).toBeGreaterThan(failedSubscriptions)
  expect(container.textContent).toBe('recovered')
})

// Control: for a source that terminates asynchronously, the entry was in the cache when `finalize` ran
// even before the fix, so this passes either way. Its job is to prove the GC harness can actually
// collect these snapshots in this environment — if this control fails, failures in the retention tests
// above point at the harness or environment rather than at a leak regression.
test('releases the last snapshot of an asynchronously completing observable after unmount', async () => {
  let snapshotRef: WeakRef<object> | undefined
  const source = defer(() =>
    timer(1).pipe(
      map(() => {
        const snapshot = {payload: 'x'.repeat(1024)}
        snapshotRef = new WeakRef(snapshot)
        return snapshot
      }),
    ),
  )

  function ObservableComponent() {
    useObservable(source)
    return null
  }

  const {unmount} = render(<ObservableComponent />)
  // Let the source emit and complete asynchronously.
  await act(async () => {
    await wait(10)
  })
  unmount()

  await forceGC()

  expect(snapshotRef!.deref()).toBeUndefined()
  // Keep the source — the WeakMap key — strongly reachable across the GC above, so the snapshot can
  // only have been released through eviction, not by the key getting collected.
  expect(source).toBeInstanceOf(Observable)
})

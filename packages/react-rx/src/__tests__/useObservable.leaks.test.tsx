import {act, render} from '@testing-library/react'
import {defer, map, Observable, of, throwError, timer} from 'rxjs'
import {expect, test} from 'vitest'

import {useObservable} from '../useObservable'

/**
 * Regression tests: `useObservable` keeps a module-level `WeakMap<Observable, CacheRecord>` where each
 * record retains the last snapshot (or error) produced by the source. Records are only ever removed by
 * `finalize(() => cache.delete(observable))` in the piped observable, which runs when the source
 * completes or errors.
 *
 * For long-lived source observables (e.g. declared at module scope in an app) that eviction is what
 * keeps a terminated source's last snapshot or error from being retained forever: the WeakMap key —
 * the source — stays strongly reachable, so only deleting the entry releases what it holds. A
 * poisoned entry that survived termination would also replay its stale error on later mounts
 * instead of re-subscribing the source.
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

test('releases the last snapshot of a synchronously completing observable after unmount', async () => {
  let snapshotRef: WeakRef<object> | undefined
  // Long-lived source, as if declared at module scope in an app. It emits a fresh object per
  // subscription and completes synchronously (like a replayed+completed cache observable would).
  const source = defer(() => {
    const snapshot = {payload: 'x'.repeat(1024)}
    snapshotRef = new WeakRef(snapshot)
    return of<unknown>(snapshot)
  })

  function ObservableComponent() {
    useObservable(source, undefined)
    return null
  }

  // The commit-time store subscription delivers the snapshot; the synchronous completion runs
  // `finalize` right away, which must find the entry in the cache and evict it.
  const {unmount} = render(<ObservableComponent />)
  unmount()

  await forceGC()

  expect(snapshotRef!.deref()).toBeUndefined()
  // Keep the source — the WeakMap key — strongly reachable across the GC above, so the snapshot
  // can only have been released through eviction, not by the key getting collected.
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

  // The error is captured by the commit-time store subscription and thrown from `getSnapshot` on
  // the forced re-render. The source keeps failing for the whole mount, which keeps the test
  // agnostic to how many render attempts React makes before surfacing the error.
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

// Control: proves the GC harness can actually collect these snapshots in this environment — if
// this control fails, failures in the retention tests above point at the harness or environment
// rather than at a leak regression.
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
    useObservable(source, undefined)
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

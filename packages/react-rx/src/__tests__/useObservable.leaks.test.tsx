import {act, render} from '@testing-library/react'
import {defer, map, Observable, of, Subject, throwError, timer} from 'rxjs'
import {expect, test} from 'vitest'

import {useObservable} from '../useObservable'

/**
 * Regression tests: `useObservable` keeps a module-level `WeakMap<Observable, CacheRecord>` where each
 * record retains the last snapshot (or error) produced by the source. Records are only ever removed by
 * `finalize(() => cache.delete(observable))` in the piped observable.
 *
 * The eager warm-up subscription inside `useMemo` used to run BEFORE `cache.set(observable, entry)`.
 * For sources that terminate (complete or error) synchronously upon subscription, `finalize` fired
 * during that eager subscription — while the entry was not yet in the cache — so the delete was a
 * no-op and the entry was inserted right after, with nothing left to evict it. The entry then
 * retained the last snapshot/error for as long as the source observable object itself stayed alive,
 * and a poisoned entry replayed its stale error on later mounts instead of re-subscribing.
 *
 * Since `initialValue` became required, the warm-up only runs for replacement observables after the
 * hook has received an emission — so these scenarios swap in the terminating source after a first
 * emission. A synchronously erroring replacement still throws during render (before commit), which
 * means no store subscription ever runs that could clean the entry up afterwards — the eviction
 * during the warm-up itself is all there is.
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

/** Kept at module scope so identity is stable across re-renders. */
function UndefinedInitialProbe({observable}: {observable: Observable<unknown>}) {
  useObservable(observable, undefined)
  return null
}

test('releases the snapshots of a synchronously completing observable warmed up as a replacement', async () => {
  const snapshotRefs: WeakRef<object>[] = []
  // Long-lived source, as if declared at module scope in an app. It emits a fresh object per
  // subscription and completes synchronously (like a replayed+completed cache observable would).
  const source = defer(() => {
    const snapshot = {payload: 'x'.repeat(1024)}
    snapshotRefs.push(new WeakRef(snapshot))
    return of<unknown>(snapshot)
  })
  const subject = new Subject<unknown>()

  const {rerender, unmount} = render(<UndefinedInitialProbe observable={subject} />)
  // The replacement warm-up only engages once the hook has received an emission.
  act(() => subject.next('emitted'))

  // The swap warms `source` up during render; it completes synchronously during that eager
  // subscription, so `finalize` must find the entry in the cache and evict it right away.
  rerender(<UndefinedInitialProbe observable={source} />)
  unmount()

  await forceGC()

  expect(snapshotRefs.length).toBeGreaterThan(0)
  for (const ref of snapshotRefs) {
    expect(ref.deref()).toBeUndefined()
  }
  // Keep the source — the WeakMap key — strongly reachable across the GC above, so the snapshots
  // can only have been released through eviction, not by the key getting collected.
  expect(source).toBeInstanceOf(Observable)
})

/** Kept at module scope so identity is stable across re-renders. */
function RenderedValueProbe({observable}: {observable: Observable<string>}) {
  return <>{useObservable(observable, 'initial')}</>
}

test('re-subscribes a synchronously erroring observable on a later mount instead of replaying a stale error', async () => {
  let shouldFail = true
  let subscriptions = 0
  const source = defer(() => {
    subscriptions++
    return shouldFail ? throwError(() => new Error('transient error')) : of('recovered')
  })
  const subject = new Subject<string>()

  // Swap to the erroring source after an emission: the replacement warm-up subscribes it during
  // render, captures the error, and the same render throws it from `getSnapshot` — before commit,
  // so no store subscription ever runs that could clean up the cache entry created for the errored
  // source. The source keeps failing for the whole swap, which keeps the test agnostic to how many
  // render attempts React makes before surfacing the error.
  const first = render(<RenderedValueProbe observable={subject} />)
  act(() => subject.next('emitted'))
  expect(() => first.rerender(<RenderedValueProbe observable={source} />)).toThrow(
    'transient error',
  )
  const failedSubscriptions = subscriptions
  expect(failedSubscriptions).toBeGreaterThan(0)

  // Give any pending grace-period timers a chance to run, then let the upstream failure resolve.
  await wait(10)
  shouldFail = false

  // A later mount in the same runtime must re-subscribe the source (which has recovered) instead of
  // a leftover cache entry replaying the stale error and turning the transient failure permanent.
  const {container} = render(<RenderedValueProbe observable={source} />)
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

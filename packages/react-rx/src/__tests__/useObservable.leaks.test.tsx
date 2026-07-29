import {setFlagsFromString} from 'node:v8'
import {runInNewContext} from 'node:vm'

import {act, render} from '@testing-library/react'
import {renderToString} from 'react-dom/server'
import {defer, map, of, throwError, timer} from 'rxjs'
import {expect, test} from 'vitest'

import {useObservable} from '../useObservable'

/**
 * Regression tests: `useObservable` keeps a module-level `WeakMap<Observable, CacheRecord>` where each
 * record retains the last snapshot (or error) produced by the source. Records are only ever removed by
 * `finalize(() => cache.delete(observable))` in the piped observable.
 *
 * The eager subscription inside `useMemo` used to run BEFORE `cache.set(observable, entry)`. For sources
 * that terminate (complete or error) synchronously upon subscription, `finalize` fired during that eager
 * subscription — while the entry was not yet in the cache — so the delete was a no-op, and the entry
 * inserted right after could never be removed again. It retained the last snapshot/error for as long as
 * the source observable object stayed alive, even with zero subscribers and no mounted components, and
 * poisoned entries replayed stale errors on later mounts instead of re-subscribing the source.
 */

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// Obtain a real `gc()` without requiring the test runner to pass `--expose-gc` to node.
const gc = (() => {
  setFlagsFromString('--expose_gc')
  return runInNewContext('gc') as () => void
})()

async function forceGC() {
  // A WeakRef target is kept alive until the end of the job it was created/dereferenced in, and a single
  // pass isn't always enough to collect the whole graph, so yield to the macrotask queue between passes.
  for (let i = 0; i < 5; i++) {
    // oxlint-disable-next-line no-await-in-loop -- GC passes must run sequentially
    await wait(0)
    gc()
  }
}

test(
  'releases the last snapshot of a synchronously completing observable used by a disabled hook',
  async () => {
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

    // The component is unmounted and the hook never subscribed (disabled) — the cache entry created
    // during render must have been evicted, releasing the snapshot.
    expect(snapshotRef!.deref()).toBeUndefined()
  },
)

test(
  'releases the last snapshot of a synchronously completing observable after server-side rendering',
  async () => {
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
    // during render — the cache entry must not outlive it.
    renderToString(<ObservableComponent />)

    await forceGC()

    expect(snapshotRef!.deref()).toBeUndefined()
  },
)

test(
  're-subscribes a synchronously erroring observable on a later mount instead of replaying a stale error',
  async () => {
    let subscriptions = 0
    const source = defer(() =>
      ++subscriptions === 1 ? throwError(() => new Error('transient error')) : of('recovered'),
    )

    function ObservableComponent() {
      return <>{useObservable(source, 'initial')}</>
    }

    // Server render: the source errors synchronously during the eager render-phase subscription. The
    // markup is unaffected because SSR renders `getServerSnapshot` (the initial value), and no store
    // subscription ever runs that could clean up the cache entry created for the errored source.
    expect(renderToString(<ObservableComponent />)).toBe('initial')
    expect(subscriptions).toBe(1)

    // Give any pending grace-period timers a chance to run.
    await wait(10)

    // Client mount: the source must be re-subscribed (it has recovered) instead of a leftover cache
    // entry replaying the stale error and turning the transient failure permanent.
    const {container} = render(<ObservableComponent />)
    expect(subscriptions).toBeGreaterThan(1)
    expect(container.textContent).toBe('recovered')
  },
)

// Control: for a source that terminates asynchronously, the entry was in the cache when `finalize` ran
// even before the fix. This test primarily proves the GC harness above is sound: if the harness were
// unable to collect anything, the tests above would pass vacuously.
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
})

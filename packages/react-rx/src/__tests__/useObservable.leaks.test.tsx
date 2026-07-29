import {setFlagsFromString} from 'node:v8'
import {runInNewContext} from 'node:vm'

import {act, render} from '@testing-library/react'
import {renderToString} from 'react-dom/server'
import {defer, map, of, throwError, timer} from 'rxjs'
import {expect, test} from 'vitest'

import {useObservable} from '../useObservable'

/**
 * `useObservable` keeps a module-level `WeakMap<Observable, CacheRecord>` where each record retains the
 * last snapshot (or error) produced by the source. Records are only ever removed by
 * `finalize(() => cache.delete(observable))` in the piped observable.
 *
 * However, the eager subscription inside `useMemo` runs BEFORE `cache.set(observable, entry)`. For sources
 * that terminate (complete or error) synchronously upon subscription, `finalize` fires during that eager
 * subscription — while the entry is not yet in the cache — so the delete is a no-op, and the entry inserted
 * right after can never be removed again. It retains the last snapshot/error for as long as the source
 * observable object is alive, even with zero subscribers and no mounted components.
 *
 * The tests below assert the DESIRED behavior and are marked `test.fails` because they currently fail,
 * which proves the leak. Once the leak is fixed, vitest will report them as unexpectedly passing so the
 * `.fails` markers can be removed.
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

test.fails(
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

    // The component is unmounted and the hook never subscribed (disabled), yet the cache entry created
    // during render was inserted after `finalize` had already run, so the snapshot is retained forever.
    expect(snapshotRef!.deref()).toBeUndefined()
  },
)

test.fails(
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
    // during render — the poisoned cache entry accumulates once per unique observable per server process.
    renderToString(<ObservableComponent />)

    await forceGC()

    expect(snapshotRef!.deref()).toBeUndefined()
  },
)

test.fails(
  're-subscribes a synchronously erroring observable on a later mount instead of replaying a stale error',
  async () => {
    let subscriptions = 0
    const source = defer(() =>
      ++subscriptions === 1 ? throwError(() => new Error('transient error')) : of('recovered'),
    )

    function ObservableComponent() {
      return <>{useObservable(source, 'initial')}</>
    }

    // First mount: the transient error is thrown during the render phase — expected behavior.
    expect(() => render(<ObservableComponent />)).toThrow('transient error')

    // Give any pending grace-period timers a chance to run.
    await wait(10)

    // A fresh mount should re-subscribe the source (which has recovered), but because the render above
    // threw before commit, no store subscription ever ran and the immortal cache entry keeps replaying
    // the stale error without ever giving the source a second chance.
    const {container} = render(<ObservableComponent />)
    expect(subscriptions).toBe(2)
    expect(container.textContent).toBe('recovered')
  },
)

// Control: for a source that terminates asynchronously, the entry is already in the cache when `finalize`
// runs, cleanup works, and the snapshot is collectable. This proves the GC harness above is sound and that
// the failures are specific to synchronous termination.
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

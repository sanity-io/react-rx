import {asapScheduler, catchError, finalize, map, of, share, tap, timer} from 'rxjs'
import type {Observable, ObservedValueOf} from 'rxjs'

import {paceToRenderIdle} from './renderPacing'
import {getValue} from './utils'

interface ObservableState<T> {
  didEmit: boolean
  snapshot?: T
  error?: unknown
}

interface CacheRecord<T> {
  observable: Observable<void>
  pacedObservable: Observable<void>
  state: ObservableState<T>
  getSnapshot: (initialValue: unknown) => T
  getPacedSnapshot: (initialValue: unknown) => T
}

const cache = new WeakMap<Observable<any>, CacheRecord<any>>()

/**
 * Returns the external-store adapter for `observable` — a notifier observable plus a `getSnapshot`
 * suitable for `useSyncExternalStore` — creating (and warming up) a shared cache entry if there
 * isn't one yet. The cache is shared between `useObservable` and `useSyncObservable`, so both
 * hooks reuse the same entry and source subscription for the same observable.
 *
 * Each entry exposes two branches over the one source subscription: a live branch
 * (`observable`/`getSnapshot`, used by `useSyncObservable` and the eager warm-up) that updates
 * the moment the source emits, and a render-paced branch (`pacedObservable`/`getPacedSnapshot`,
 * used by `useObservable`) that holds emission bursts and delivers only the latest once the main
 * thread goes idle — see {@link paceToRenderIdle}.
 *
 * @internal
 */
export function getOrCreateStore<ObservableType extends Observable<any>>(
  observable: ObservableType,
): CacheRecord<ObservedValueOf<ObservableType>> {
  const cached = cache.get(observable)
  if (cached) {
    return cached
  }
  // These separate objects are used as stable references to the cache entry's snapshots and
  // errors. They are used by the `getSnapshot`/`getPacedSnapshot` closures. `pacedState` trails
  // `state` by at most one render-idle window while the paced pipeline is subscribed.
  const state: ObservableState<ObservedValueOf<ObservableType>> = {
    didEmit: false,
  }
  const pacedState: ObservableState<ObservedValueOf<ObservableType>> = {
    didEmit: false,
  }

  // The live pipeline: any value or error emitted by the provided observable is mapped to the
  // entry's mutable `state` the moment it emits. Both notifier branches below share this one
  // source subscription.
  const values$ = observable.pipe(
    map((value) => ({snapshot: value, error: undefined})),
    catchError((error) => of({snapshot: undefined, error})),
    tap(({snapshot, error}) => {
      state.didEmit = true
      state.snapshot = snapshot
      state.error = error
    }),
    // Ensure that the cache entry is deleted when the observable completes or errors.
    // Comparing `state` (unique per entry) prevents teardown of a stale, already replaced entry
    // from deleting its successor.
    finalize(() => {
      if (cache.get(observable)?.state === state) {
        cache.delete(observable)
      }
    }),
    share({resetOnRefCountZero: () => timer(0, asapScheduler)}),
  )

  const entry: CacheRecord<ObservedValueOf<ObservableType>> = {
    state,
    // Note: emitted values are captured in the mutable state above and both branches are
    // thereafter only used as notifiers to call `onStoreChange`, hence the `void` return type.
    observable: values$.pipe(map((value) => void value)),
    // The render-paced branch. Pacing only the notifications would not be enough:
    // `useSyncExternalStore`'s consistency check re-reads the snapshot mid-pass and would observe
    // the newer live `state`, restarting the pass anyway — so paced deliveries are captured in
    // the separate `pacedState` that `getPacedSnapshot` reads.
    pacedObservable: values$.pipe(
      paceToRenderIdle(),
      tap(({snapshot, error}) => {
        pacedState.didEmit = true
        pacedState.snapshot = snapshot
        pacedState.error = error
      }),
      map((value) => void value),
      // When the paced pipeline disconnects (the last paced subscriber left, or the source
      // terminated), stop trusting `pacedState`: the live `state` can move on while nothing is
      // subscribed here, and a later mount must not render a stale paced snapshot. Falling back
      // to the live state is always safe while nothing is being paced — it holds the latest
      // value, including any trailing value an open idle window was still going to deliver.
      finalize(() => {
        pacedState.didEmit = false
        pacedState.snapshot = undefined
        pacedState.error = undefined
      }),
      // Synchronous reset (no grace): the reset-grace that keeps the *source* alive across
      // resubscription churn lives on `values$` above, and chaining a second grace here would
      // double the teardown latency after unmount. Discarding in-flight pacing on a momentary
      // refcount zero is safe — see the `finalize` note above.
      share(),
    ),
    getSnapshot: (initialValue) => {
      if (state.error) {
        throw state.error
      }
      return (
        state.didEmit ? state.snapshot : getValue(initialValue)
      ) as ObservedValueOf<ObservableType>
    },
    // Reads the paced state, falling back to the live state until the first paced delivery: the
    // paced pipeline subscribes at commit and only sees future emissions, so synchronous first
    // values at mount come from the live state seeded by the warm-up below.
    getPacedSnapshot: (initialValue) => {
      const current = pacedState.didEmit ? pacedState : state
      if (current.error) {
        throw current.error
      }
      return (
        current.didEmit ? current.snapshot : getValue(initialValue)
      ) as ObservedValueOf<ObservableType>
    },
  }

  // The entry must be added to the cache before the eager subscription below: if the observable
  // terminates synchronously during it, `finalize` runs right away and must find the entry in order to
  // delete it. Inserting the entry afterwards would retain it (and its last snapshot or error) for as
  // long as the source observable lives, and poisoned entries would replay stale errors on remount
  // instead of re-subscribing the source.
  cache.set(observable, entry)

  // Eagerly subscribe during render to warm up a synchronous snapshot into `state`. This runs even
  // when `disabled` is true — `disabled` only pauses the hooks' live store subscription. The
  // subscribe/unsubscribe here does not keep the observable alive; the store subscription does.
  const subscription = entry.observable.subscribe()
  subscription.unsubscribe()

  // For synchronously terminating observables the entry has already been evicted from the cache again
  // at this point, so return the local reference instead of reading back from the cache.
  return entry
}

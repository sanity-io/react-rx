import {asapScheduler, catchError, finalize, map, of, share, tap, timer} from 'rxjs'
import type {Observable, ObservedValueOf} from 'rxjs'

import {getValue} from './utils'

interface ObservableState<T> {
  didEmit: boolean
  snapshot?: T
  error?: unknown
}

interface CacheRecord<T> {
  observable: Observable<void>
  state: ObservableState<T>
  getSnapshot: (initialValue: unknown) => T
}

const cache = new WeakMap<Observable<any>, CacheRecord<any>>()

/**
 * Returns the external-store adapter for `observable` — a notifier observable plus a `getSnapshot`
 * suitable for `useSyncExternalStore` — creating a shared cache entry if there isn't one yet. The
 * cache is shared between `useObservable` and `useSyncObservable`, so both hooks reuse the same
 * entry and source subscription for the same observable.
 *
 * Creating the entry performs no subscription: the source is never subscribed during render.
 * `getSnapshot` returns the resolved `initialValue` until the store subscription (started on
 * commit) delivers the first emission into the entry's state.
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
  // This separate object is used as a stable reference to the cache entry's snapshot and error.
  // It's used by the `getSnapshot` closure.
  const state: ObservableState<ObservedValueOf<ObservableType>> = {
    didEmit: false,
  }
  const entry: CacheRecord<ObservedValueOf<ObservableType>> = {
    state,
    observable: observable.pipe(
      map((value) => ({snapshot: value, error: undefined})),
      catchError((error) => of({snapshot: undefined, error})),
      tap(({snapshot, error}) => {
        state.didEmit = true
        state.snapshot = snapshot
        state.error = error
      }),
      // Note: any value or error emitted by the provided observable will be mapped to the cache entry's mutable state
      // and the observable is thereafter only used as a notifier to call `onStoreChange`, hence the `void` return type.
      map((value) => void value),
      // Ensure that the cache entry is deleted when the observable completes or errors, so the
      // last snapshot or error does not outlive the source and a later mount re-subscribes it.
      // Comparing `state` (unique per entry) prevents teardown of a stale, already replaced entry
      // from deleting its successor.
      finalize(() => {
        if (cache.get(observable)?.state === state) {
          cache.delete(observable)
        }
      }),
      share({resetOnRefCountZero: () => timer(0, asapScheduler)}),
    ),
    getSnapshot: (initialValue) => {
      if (state.error) {
        throw state.error
      }
      return (
        state.didEmit ? state.snapshot : getValue(initialValue)
      ) as ObservedValueOf<ObservableType>
    },
  }

  cache.set(observable, entry)

  return entry
}

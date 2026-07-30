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
 * suitable for `useSyncExternalStore` — creating (and warming up) a shared cache entry if there
 * isn't one yet. The cache is shared between `useObservable` and `useSyncObservable`, so both
 * hooks reuse the same entry and source subscription for the same observable.
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
      // Ensure that the cache entry is deleted when the observable completes or errors.
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

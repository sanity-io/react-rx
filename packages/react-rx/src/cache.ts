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
  /** Whether the eager render-phase warm-up subscription has run for this entry. */
  warmedUp: boolean
}

const cache = new WeakMap<Observable<any>, CacheRecord<any>>()

/**
 * Returns the external-store adapter for `observable` — a notifier observable plus a `getSnapshot`
 * suitable for `useSyncExternalStore` — creating a shared cache entry if there isn't one yet. The
 * cache is shared between `useObservable` and `useSyncObservable`, so both hooks reuse the same
 * entry and source subscription for the same observable.
 *
 * With `shouldWarmUp: true` the entry is also warmed up so that a synchronous emission (e.g. from
 * `startWith`) is available on the caller's first render of it. The hooks request this for every
 * observable except their initial one when an `initialValue` is provided — in that case there is
 * already a value to render, so the source is not subscribed during render at all and the live
 * store subscription picks up emissions once the hook commits.
 *
 * @internal
 */
export function getOrCreateStore<ObservableType extends Observable<any>>(
  observable: ObservableType,
  shouldWarmUp: boolean,
): CacheRecord<ObservedValueOf<ObservableType>> {
  const cached = cache.get(observable)
  if (cached) {
    // A consumer that relies on synchronous emissions being available during its first render may
    // hit an entry created by a caller that skipped the warm-up — warm it up on its behalf.
    if (shouldWarmUp && !cached.warmedUp) {
      warmUp(cached)
    }
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
    warmedUp: false,
  }

  // The entry must be added to the cache before the eager warm-up subscription below: if the
  // observable terminates synchronously during it, `finalize` runs right away and must find the entry
  // in order to delete it. Inserting the entry afterwards would retain it (and its last snapshot or
  // error) for as long as the source observable lives, and poisoned entries would replay stale errors
  // on remount instead of re-subscribing the source.
  cache.set(observable, entry)

  // The warm-up runs even when `disabled` is true — `disabled` only pauses the hooks' live store
  // subscription. When it is skipped (the hooks' initial observable with an `initialValue`),
  // subscribe-time side effects stay out of the render phase; the source is first subscribed when
  // the store subscription starts on commit.
  if (shouldWarmUp) {
    warmUp(entry)
  }

  // When the warm-up ran and the observable terminated synchronously during it, the entry has already
  // been evicted from the cache again at this point, so return the local reference instead of reading
  // back from the cache.
  return entry
}

/**
 * Eagerly subscribe/unsubscribe during render so that a synchronous emission is captured into the
 * entry's state and can be returned from the very first render. The subscribe/unsubscribe here does
 * not keep the observable alive; the store subscription does (`share`'s reset is delayed by a
 * `timer(0, asapScheduler)` grace period).
 */
function warmUp(entry: CacheRecord<any>): void {
  entry.warmedUp = true
  const subscription = entry.observable.subscribe()
  subscription.unsubscribe()
}

// NOTE: This file intentionally duplicates `useSyncObservable.ts` — the only shared code is the
// type-only `UseObservableOptions` import. Keep the copies in sync instead of extracting shared
// helpers or merging the two WeakMap caches; deduplication is a planned follow-up PR.
import {useCallback, useDeferredValue, useMemo, useSyncExternalStore} from 'react'
import {
  asapScheduler,
  catchError,
  finalize,
  map,
  type Observable,
  type ObservedValueOf,
  of,
  share,
  tap,
  timer,
} from 'rxjs'

import type {UseObservableOptions} from './useSyncObservable'

function getValue<T>(value: T): T extends () => infer U ? U : T {
  return (typeof value === 'function' ? (value as () => any)() : value) as T extends () => infer U
    ? U
    : T
}

interface ObservableState<T> {
  didEmit: boolean
  snapshot?: T
  error?: unknown
}

interface CacheRecord<T> {
  observable: Observable<void>
  state: {
    didEmit: boolean
    snapshot?: T
    error?: unknown
  }
  getSnapshot: (initialValue: unknown) => T
}

const cache = new WeakMap<Observable<any>, CacheRecord<any>>()

const EMPTY_OBJECT = {}

/**
 * Subscribe to an observable and return its latest value, with store updates deferred via
 * [`useDeferredValue`](https://react.dev/reference/react/useDeferredValue).
 *
 * Urgent renders keep the previous value while a background render catches up — so children that
 * suspend on the returned value keep showing already-revealed content instead of the nearest
 * Suspense fallback. Mounts, remounts, and `<Activity>` reveals still render the current snapshot
 * synchronously (no initial-value flash).
 *
 * On the server this hook renders exactly what the client's first paint will show (a synchronous
 * emission when there is one, else the resolved `initialValue`, else nothing) and never throws
 * for a missing `initialValue`. Prefer {@link useSyncObservable} for controlled inputs or when you
 * need the strict v4 server-snapshot contract.
 *
 * @public
 */
export function useObservable<ObservableType extends Observable<any>>(
  observable: ObservableType,
  initialValue: ObservedValueOf<ObservableType> | (() => ObservedValueOf<ObservableType>),
  options?: UseObservableOptions,
): ObservedValueOf<ObservableType>
/** @public */
export function useObservable<ObservableType extends Observable<any>>(
  observable: ObservableType,
): undefined | ObservedValueOf<ObservableType>
/** @public */
export function useObservable<ObservableType extends Observable<any>, InitialValue>(
  observable: ObservableType,
  initialValue: InitialValue | (() => InitialValue),
  options?: UseObservableOptions,
): InitialValue | ObservedValueOf<ObservableType>
/** @public */
export function useObservable<ObservableType extends Observable<any>, InitialValue>(
  observable: ObservableType,
  initialValue?: InitialValue | (() => InitialValue),
  options: UseObservableOptions = EMPTY_OBJECT,
): InitialValue | ObservedValueOf<ObservableType> {
  const {disabled = false} = options

  const instance = useMemo(() => {
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
    // when `disabled` is true — `disabled` only pauses the live store subscription below. The
    // subscribe/unsubscribe here does not keep the observable alive; the store subscription does.
    const subscription = entry.observable.subscribe()
    subscription.unsubscribe()

    // For synchronously terminating observables the entry has already been evicted from the cache again
    // at this point, so return the local reference instead of reading back from the cache.
    return entry
  }, [observable])

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (disabled) {
        return () => {}
      }

      const subscription = instance.observable.subscribe(onStoreChange)
      return () => {
        subscription.unsubscribe()
      }
    },
    [instance.observable, disabled],
  )

  const value = useSyncExternalStore<ObservedValueOf<ObservableType>>(
    subscribe,
    () => {
      return instance.getSnapshot(initialValue)
    },
    // Always provide getServerSnapshot so SSR never throws. The server renders
    // exactly what the client's first render will show (sync emission, else
    // initialValue, else undefined).
    () => instance.getSnapshot(initialValue),
  )

  // Second arg is only read on mount / Activity reveal (mount path). Passing the
  // live snapshot means those renders show the current value with no flash;
  // later store updates are deferred. On the server, Fizz returns this arg and
  // getServerSnapshot returns the same snapshot, so SSR matches the first client paint.
  // Safe if getSnapshot throws: the useSyncExternalStore call above throws first.
  // React Compiler may memoize this getSnapshot call — harmless, React only reads it on mount/reveal.
  return useDeferredValue(value, instance.getSnapshot(initialValue))
}

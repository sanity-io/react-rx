import {useCallback, useMemo, useSyncExternalStore} from 'react'
import {
  asapScheduler,
  catchError,
  finalize,
  type Observable,
  type ObservedValueOf,
  of,
  share,
  timer,
} from 'rxjs'
import {map, tap} from 'rxjs/operators'

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

/** @public */
export interface UseObservableOptions {
  disabled?: boolean
}

/** @public */
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

    // The entry must be added to the cache before any subscription: if the observable terminates
    // synchronously during subscribe, `finalize` runs right away and must find the entry in order to
    // delete it. Inserting the entry afterwards would retain it (and its last snapshot or error) for as
    // long as the source observable lives, and poisoned entries would replay stale errors on remount
    // instead of re-subscribing the source.
    cache.set(observable, entry)

    // For synchronously terminating observables the entry may already have been evicted again by the
    // time a later subscribe finishes, so return the local reference instead of reading back from the
    // cache.
    return entry
  }, [observable])

  // Eagerly subscribe during render so a synchronous emission is available to `getSnapshot` in the
  // same pass. Skip while `disabled` — the documented contract is that the hook must not subscribe
  // until/unless it becomes enabled. Re-running when `disabled` flips to `false` primes the snapshot
  // then. The memo returns `instance` so the result is used (and so disabled toggles keep the same
  // cache entry, preserving the last snapshot after an enabled→disabled transition).
  const store = useMemo(() => {
    if (!disabled) {
      const subscription = instance.observable.subscribe()
      subscription.unsubscribe()
    }
    return instance
  }, [instance, disabled])

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (disabled) {
        return () => {}
      }

      const subscription = store.observable.subscribe(onStoreChange)
      return () => {
        subscription.unsubscribe()
      }
    },
    [store.observable, disabled],
  )

  return useSyncExternalStore<ObservedValueOf<ObservableType>>(
    subscribe,
    () => {
      return store.getSnapshot(initialValue)
    },
    typeof initialValue === 'undefined'
      ? undefined
      : () => getValue(initialValue) as ObservedValueOf<ObservableType>,
  )
}

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
    if (!cache.has(observable)) {
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
          finalize(() => cache.delete(observable)),
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

      // Eagerly subscribe to sync set `state.snapshot` to what the observable returns, and keep the observable alive until the component unmounts.
      const subscription = entry.observable.subscribe()
      subscription.unsubscribe()

      cache.set(observable, entry)
    }
    return cache.get(observable)!
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

  return useSyncExternalStore<ObservedValueOf<ObservableType>>(
    subscribe,
    () => {
      return instance.getSnapshot(initialValue)
    },
    typeof initialValue === 'undefined'
      ? undefined
      : () => getValue(initialValue) as ObservedValueOf<ObservableType>,
  )
}

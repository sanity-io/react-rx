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

interface CacheRecord<T> {
  observable: Observable<void>
  snapshot: T
  error?: unknown
}

const cache = new WeakMap<Observable<any>, CacheRecord<any>>()

const snapshots = new WeakMap<Observable<any>, ObservedValueOf<any>>()

const errors = new WeakMap<Observable<any>, unknown>()

/** @internal */
export function getOrCreateObservable<ObservableType extends Observable<any>>(
  observable: ObservableType,
  // initialValue:
  //   | ObservedValueOf<ObservableType>
  //   | (() => ObservedValueOf<ObservableType>)
  //   | undefined,
  debug?: boolean,
): CacheRecord<ObservedValueOf<ObservableType>> {
  if (!cache.has(observable)) {
    const entry: Partial<CacheRecord<ObservedValueOf<ObservableType>>> = {
      // snapshot: getValue(initialValue),
      // snapshot: undefined,
      // error: undefined,
    }
    entry.observable = observable.pipe(
      map((value) => ({snapshot: value, error: undefined})),
      catchError((error) => of({snapshot: undefined, error})),
      tap(({snapshot, error}) => {
        if (debug) {
          console.log('tap', snapshot, error)
        }
        // entry.snapshot = snapshot
        snapshots.set(observable, snapshot)
        if (error) {
          errors.set(observable, error)
        } else {
          errors.delete(observable)
        }
        // entry.error = error
      }),
      // Note: any value or error emitted by the provided observable will be mapped to the cache entry's mutable state
      // and the observable is thereafter only used as a notifier to call `onStoreChange`, hence the `void` return type.
      map((value) => void value),
      // Ensure that the cache entry is deleted when the observable completes or errors.
      finalize(() => cache.delete(observable)),
      share({resetOnRefCountZero: () => timer(0, asapScheduler)}),
    )

    // Eagerly subscribe to sync set `entry.currentValue` to what the observable returns, and keep the observable alive until the component unmounts.
    const subscription = entry.observable.subscribe()
    subscription.unsubscribe()

    cache.set(observable, entry as CacheRecord<ObservedValueOf<ObservableType>>)
  }
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return cache.get(observable)!
}

/** */
export function getSnapshot<ObservableType extends Observable<any>>(
  observable: ObservableType,
  initialValue: ObservedValueOf<ObservableType> | (() => ObservedValueOf<ObservableType>),
): ObservedValueOf<ObservableType> {
  if (errors.has(observable)) {
    throw errors.get(observable)
  }
  return (
    (snapshots.get(observable) as ObservedValueOf<ObservableType>) ??
    (getValue(initialValue) as ObservedValueOf<ObservableType>)
  )
}

/** @internal */
export function getValue<T>(value: T): T extends () => infer U ? U : T {
  return typeof value === 'function' ? value() : value
}

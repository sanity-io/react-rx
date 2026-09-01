import {useCallback, useDeferredValue, useMemo, useState, useSyncExternalStore} from 'react'
import type {Observable, ObservedValueOf} from 'rxjs'

import {getOrCreateStore} from './cache'
import type {UseObservableOptions} from './types'
import {EMPTY_OBJECT, missingInitialValueError, UNSET_INITIAL_VALUE} from './utils'

/**
 * Subscribe to an observable and return its latest value, with store updates deferred via
 * [`useDeferredValue`](https://react.dev/reference/react/useDeferredValue).
 *
 * Urgent renders keep the previous value while a background render catches up — so children that
 * suspend on the returned value keep showing already-revealed content instead of the nearest
 * Suspense fallback. Mounts, remounts, and `<Activity>` reveals still render the current snapshot
 * synchronously (no initial-value flash once a value has been emitted).
 *
 * `initialValue` is required: it is what renders until the observable emits. Every value is a
 * valid initial value, `undefined` included — pass it explicitly; omitting the argument throws
 * during render. Functions act as initializers, exactly like `useState`: pass `() => value` to
 * compute the initial value lazily, and an initializer returning the function when the initial
 * value should be a function itself. When there is no meaningful initial value, or you want to
 * show fallback UI while the observable is "loading", reach for {@link useObservablePromise} with
 * `use()` and Suspense instead.
 *
 * The observable is never subscribed during render: every render — the first one and every
 * identity change alike — shows `initialValue` (or the shared entry's last emission) and the live
 * subscription starts on commit, keeping subscribe-time side effects out of the render phase. A
 * synchronous emission replaces the `initialValue` right after that commit. Keep the observable's
 * identity stable across renders (`useMemo`, `useState`, module scope) — like
 * `useSyncExternalStore`'s `subscribe`, an observable rebuilt on every render is re-subscribed on
 * every render, and when it synchronously replays a value that differs from the `initialValue`
 * this forces a render loop.
 *
 * The deferral is identity-coherent: unlike a bare `useDeferredValue(useObservable(...))`, the
 * observable identity and its value are deferred as one snapshot, and when the observable identity
 * changes (e.g. it is memoized on a document id that just changed) the hook falls back to the live
 * value — the `initialValue`, or the new observable's last emission when it is already live
 * elsewhere — so the previous identity's value never renders under the new one.
 *
 * On the server this hook never subscribes the observable and renders the resolved `initialValue`
 * — exactly what the client's first paint will show. Prefer {@link useSyncObservable} for
 * controlled inputs or when the value must stay consistent within the same event.
 *
 * @public
 */
export function useObservable<ObservableType extends Observable<any>>(
  observable: ObservableType,
  initialValue: ObservedValueOf<ObservableType> | (() => ObservedValueOf<ObservableType>),
  options?: UseObservableOptions,
): ObservedValueOf<ObservableType>
/** @public */
export function useObservable<ObservableType extends Observable<any>, InitialValue>(
  observable: ObservableType,
  initialValue: InitialValue | (() => InitialValue),
  options?: UseObservableOptions,
): InitialValue | ObservedValueOf<ObservableType>
/** @public */
export function useObservable<ObservableType extends Observable<any>, InitialValue>(
  observable: ObservableType,
  ...args: [initialValue?: InitialValue | (() => InitialValue), options?: UseObservableOptions]
): InitialValue | ObservedValueOf<ObservableType> {
  // `undefined` (like every other value) is a valid `initialValue`, so a missing argument is
  // detected by arity and modeled with a sentinel no caller can pass.
  const initialValue =
    args.length === 0 ? UNSET_INITIAL_VALUE : (args[0] as InitialValue | (() => InitialValue))
  if (initialValue === UNSET_INITIAL_VALUE) {
    throw missingInitialValueError('useObservable')
  }
  const {disabled = false} = args[1] ?? EMPTY_OBJECT

  // Resolve function initializers once per hook instance, exactly like `useState`.
  // `getSnapshot` must return the same reference on every pre-emission read: an
  // initializer producing a fresh object per call would make `useSyncExternalStore`'s
  // consistency check see a store change on every render and loop until React aborts.
  const [resolvedInitialValue] = useState(initialValue)

  const instance = useMemo(() => getOrCreateStore(observable), [observable])

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
    [instance, disabled],
  )

  const value = useSyncExternalStore<ObservedValueOf<ObservableType>>(
    subscribe,
    () => {
      return instance.getSnapshot(resolvedInitialValue)
    },
    // The server renders exactly what the client's first render will show: the resolved
    // initialValue (or the last emission of a shared entry that is already live).
    () => instance.getSnapshot(resolvedInitialValue),
  )

  // Defer identity and value as one snapshot so they can never tear — the
  // deferred value always belongs to the deferred observable.
  const snapshot = useMemo(() => ({observable, value}), [observable, value])

  // Second arg is only read on mount / Activity reveal (mount path). Passing the
  // live snapshot means those renders show the current value with no flash;
  // later store updates are deferred. On the server, Fizz returns this arg and
  // it holds the same value getServerSnapshot returned, so SSR matches the
  // first client paint.
  const deferredSnapshot = useDeferredValue(snapshot, snapshot)

  // When the observable identity just changed, the deferred snapshot still
  // belongs to the previous observable. Fall back to the live value (the
  // initialValue, or the new observable's last emission when it is already
  // live elsewhere) so the previous identity's value never renders under the
  // new one.
  return deferredSnapshot.observable === observable ? deferredSnapshot.value : value
}

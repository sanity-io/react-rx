import {useCallback, useMemo, useState, useSyncExternalStore} from 'react'
import type {Observable, ObservedValueOf} from 'rxjs'

import {getOrCreateStore} from './cache'
import type {UseObservableOptions} from './types'
import {EMPTY_OBJECT, missingInitialValueError, UNSET_INITIAL_VALUE} from './utils'

/**
 * Subscribe to an observable and return its latest value synchronously via
 * [`useSyncExternalStore`](https://react.dev/reference/react/useSyncExternalStore).
 *
 * This is the v4 `useObservable` behavior. Prefer the deferred {@link useObservable} for most
 * reads. Reach for `useSyncObservable` when the value feeds a controlled input, or must stay
 * consistent within the same event.
 *
 * `initialValue` is required: it is what renders until the observable emits, and what the server
 * renders. Every value is a valid initial value, `undefined` included — pass it explicitly;
 * omitting the argument throws during render. Functions act as initializers, exactly like
 * `useState`: pass `() => value` to compute the initial value lazily, and an initializer
 * returning the function when the initial value should be a function itself. When there is no
 * meaningful initial value, or you want to show fallback UI while the observable is "loading",
 * reach for {@link useObservablePromise} with `use()` and Suspense instead.
 *
 * Like {@link useObservable}, the observable is never subscribed during render: every render —
 * the first one and every identity change alike — shows `initialValue` (or the shared entry's
 * last emission) and the live subscription starts on commit. Keep the observable's identity
 * stable across renders (`useMemo`, `useState`, module scope) — like `useSyncExternalStore`'s
 * `subscribe`, an observable rebuilt on every render is re-subscribed on every render, and when
 * it synchronously replays a value that differs from the `initialValue` this forces a render
 * loop.
 *
 * **Caveat:** store mutations cannot be marked as Transitions. Suspending on a value returned by
 * this hook replaces already-visible content with the nearest Suspense fallback — see the
 * [useSyncExternalStore caveats](https://react.dev/reference/react/useSyncExternalStore#caveats).
 *
 * @public
 */
export function useSyncObservable<ObservableType extends Observable<any>>(
  observable: ObservableType,
  initialValue: ObservedValueOf<ObservableType> | (() => ObservedValueOf<ObservableType>),
  options?: UseObservableOptions,
): ObservedValueOf<ObservableType>
/** @public */
export function useSyncObservable<ObservableType extends Observable<any>, InitialValue>(
  observable: ObservableType,
  initialValue: InitialValue | (() => InitialValue),
  options?: UseObservableOptions,
): InitialValue | ObservedValueOf<ObservableType>
/** @public */
export function useSyncObservable<ObservableType extends Observable<any>, InitialValue>(
  observable: ObservableType,
  ...args: [initialValue?: InitialValue | (() => InitialValue), options?: UseObservableOptions]
): InitialValue | ObservedValueOf<ObservableType> {
  // `undefined` (like every other value) is a valid `initialValue`, so a missing argument is
  // detected by arity and modeled with a sentinel no caller can pass.
  const initialValue =
    args.length === 0 ? UNSET_INITIAL_VALUE : (args[0] as InitialValue | (() => InitialValue))
  if (initialValue === UNSET_INITIAL_VALUE) {
    throw missingInitialValueError('useSyncObservable')
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

  return useSyncExternalStore<ObservedValueOf<ObservableType>>(
    subscribe,
    () => {
      return instance.getSnapshot(resolvedInitialValue)
    },
    // Strict v4 server contract: the server always renders the resolved `initialValue` — even
    // when a shared cache entry has already emitted in the same runtime.
    () => resolvedInitialValue as ObservedValueOf<ObservableType>,
  )
}

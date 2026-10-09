import {useCallback, useMemo, useSyncExternalStore} from 'react'
import type {Observable, ObservedValueOf} from 'rxjs'

import {getOrCreateStore} from './cache'
import type {UseObservableOptions} from './types'
import {useResolvedInitialValue} from './useResolvedInitialValue'
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
 * omitting the argument throws during render. Functions act as initializers, like `useState`:
 * pass `() => value` to compute the initial value lazily, and an initializer returning the
 * function when the initial value should be a function itself. The argument is resolved again
 * when the observable identity changes, and ignored on later renders while that identity is
 * stable. When there is no meaningful initial value, or you want to show fallback UI while the
 * observable is "loading", reach for {@link useObservablePromise} with `use()` and Suspense
 * instead.
 *
 * Like {@link useObservable}, the observable is never subscribed during render: every render —
 * the first one and every identity change alike — shows the resolved `initialValue` for the
 * current identity (or the shared entry's last emission) and the live subscription starts on
 * commit. A synchronous emission replaces the `initialValue` right after that commit. The server
 * snapshot is the resolved `initialValue` even when a shared entry has already emitted. Keep the
 * observable's identity stable across renders (`useMemo`, `useState`, module scope) — like
 * `useSyncExternalStore`'s `subscribe`, an observable rebuilt on every render is re-subscribed
 * on every render. A fresh initial-value reference on those renders does not by itself loop:
 * nothing notifies the store unless the new subscription synchronously replays a value. The
 * replay loops when it is not `Object.is` to the initial value resolved for that identity. v7
 * only compared the replay with the initial value captured at mount, so a replay of that
 * captured value settled even while later renders passed a different placeholder. Memoize
 * placeholders that must stay `Object.is` to the replay (`useMemo`, module scope). `useCallback`
 * on a factory does not help when calling it returns a new reference.
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

  // Once per observable identity, not on every `getSnapshot` read and not on every render.
  // See `useResolvedInitialValue`. `getServerSnapshot` returns this value directly so a shared
  // cache entry that has already emitted cannot leak into the server render.
  const resolvedInitialValue = useResolvedInitialValue(observable, initialValue)

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

  return useSyncExternalStore(
    subscribe,
    () => {
      return instance.getSnapshot(resolvedInitialValue)
    },
    // Strict v4 server contract: the server always renders the resolved `initialValue` — even
    // when a shared cache entry has already emitted in the same runtime.
    () => resolvedInitialValue as ObservedValueOf<ObservableType>,
  )
}

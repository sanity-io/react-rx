import {useCallback, useDeferredValue, useMemo, useState, useSyncExternalStore} from 'react'
import type {Observable, ObservedValueOf} from 'rxjs'

import {getOrCreateStore, needsWarmUp, trackSubscribed, type WarmUpTracker} from './cache'
import type {UseObservableOptions} from './types'
import {EMPTY_OBJECT} from './utils'

/**
 * Subscribe to an observable and return its latest value, with store updates deferred via
 * [`useDeferredValue`](https://react.dev/reference/react/useDeferredValue).
 *
 * Urgent renders keep the previous value while a background render catches up — so children that
 * suspend on the returned value keep showing already-revealed content instead of the nearest
 * Suspense fallback. Mounts, remounts, and `<Activity>` reveals still render the current snapshot
 * synchronously (no initial-value flash once a value has been emitted).
 *
 * When no `initialValue` is given, the observable is briefly subscribed during render so a
 * synchronous emission (e.g. from `startWith`) can be returned from the very first render. With an
 * `initialValue` the observable is not subscribed during render: the `initialValue` renders first
 * and the live subscription starts on commit, keeping subscribe-time side effects out of the
 * render phase — a synchronous emission then replaces the `initialValue` right after mount. Only
 * once the hook has received an emission are replacement observables (a changed identity on a
 * later render) warmed up during render again: rendering their synchronous emission immediately is
 * what lets consumers that rebuild the observable on every render settle instead of re-rendering
 * forever. Identity churn before the first emission (e.g. Strict Mode double renders or parent
 * updates) and any identity churn while `disabled` stay subscription-free.
 *
 * The deferral is identity-coherent: unlike a bare `useDeferredValue(useObservable(...))`, the
 * observable identity and its value are deferred as one snapshot, and when the observable identity
 * changes (e.g. it is memoized on a document id that just changed) the hook falls back to the live
 * value — typically the new observable's synchronous emission or the `initialValue` — so the
 * previous identity's value never renders under the new one.
 *
 * On the server this hook renders exactly what the client's first paint will show (the resolved
 * `initialValue` when one is provided, else a synchronous emission when there is one, else nothing)
 * and never throws for a missing `initialValue`. Prefer {@link useSyncObservable} for controlled
 * inputs or when you need the strict v4 server-snapshot contract.
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
): InitialValue | ObservedValueOf<ObservableType> | undefined {
  const {disabled = false} = options

  const hasInitialValue = typeof initialValue !== 'undefined'
  const [resolvedInitialValue] = useState(initialValue)
  // With an `initialValue` the warm-up is skipped until this hook has received an emission; after
  // that, replacement observables are warmed during render again so that consumers that rebuild
  // the observable on every render converge instead of looping — see `needsWarmUp`. The tracker is
  // only ever written on commit (in `subscribe` below), never during render.
  const [tracker] = useState((): WarmUpTracker => ({last: null}))
  const shouldWarmUp = needsWarmUp(tracker, observable, hasInitialValue, disabled)
  const instance = useMemo(
    () => getOrCreateStore(observable, shouldWarmUp),
    [observable, shouldWarmUp],
  )

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (disabled) {
        return () => {}
      }
      trackSubscribed(tracker, observable, instance)

      const subscription = instance.observable.subscribe(onStoreChange)
      return () => {
        subscription.unsubscribe()
      }
    },
    [tracker, observable, instance, disabled],
  )

  const value = useSyncExternalStore(
    subscribe,
    () => instance.getSnapshot(resolvedInitialValue),
    // Always provide getServerSnapshot so SSR never throws. The server renders
    // exactly what the client's first render will show (the resolved initialValue
    // when provided, else a sync emission, else undefined).
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
  // belongs to the previous observable. Fall back to the live value (typically
  // the new observable's sync emission or the initialValue) so the previous
  // identity's value never renders under the new one.
  return deferredSnapshot.observable === observable ? deferredSnapshot.value : value
}

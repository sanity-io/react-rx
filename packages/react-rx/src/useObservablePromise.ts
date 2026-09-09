import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from 'react'
import {type Observable} from 'rxjs'

import {
  asObservablePromise,
  ObservablePromiseImpl,
  type ObservablePromise,
} from './observablePromise'
import {
  DEFAULT_HOOK_TTL,
  DEFAULT_PRELOAD_TTL,
  getObservablePromiseEntry,
  type ObservablePromiseEntry,
} from './observablePromiseCache'

const EMPTY_OPTIONS = {}

/**
 * react-rx is a client-only library: observables are never subscribed on the
 * server. A server-started subscription has no unmount to tear it down, a
 * never-settling source would keep it (and the response stream) alive
 * forever, and the module-scope cache would be shared across requests.
 * `window` exists in browsers and React Native but not in server/edge
 * runtimes.
 */
const IS_SERVER = typeof window === 'undefined'

/** @public */
export interface UseObservablePromiseOptions {
  /**
   * When `true`, this component does not start the live store subscription at
   * commit — no data fetching on behalf of this component, and no re-render
   * notifications for later emissions (the returned promise only advances when
   * this component re-renders for other reasons).
   *
   * Like {@link useObservable}'s `disabled`, this fully prevents fetching. The
   * returned promise is the shared cache entry's current promise: it stays
   * pending until another consumer or {@link preloadObservablePromise} starts
   * the source, or this component re-renders with `disabled: false` — at which
   * point the same pending promise resolves.
   */
  disabled?: boolean
  /**
   * Retention (ms) of the cache entry once it is settled and has no live
   * subscribers: how long a settled value stays reusable by a later mount
   * without refetching, and how long the shared connection lingers before
   * teardown/eviction. The entry adopts the max `ttl` across all of its
   * consumers.
   *
   * Eviction only affects future consumers: components that are still mounted
   * keep their entry pinned, so hiding a `<Activity>` tree longer than `ttl`
   * does not drop the value it rendered.
   *
   * @defaultValue 500
   */
  ttl?: number
}

/** @public */
export interface PreloadObservablePromiseOptions {
  /**
   * Retention (ms) for the preloaded cache entry when nothing consumes it.
   *
   * @defaultValue 5000
   */
  ttl?: number
}

/**
 * Subscribe to an observable and return a `use()`-compatible promise that
 * activates Suspense until the first emission, then updates synchronously for
 * later emissions without re-suspending.
 *
 * The returned promise is meant to be passed as a prop to a child component
 * that reads it with React's `use()`, with a `<Suspense>` boundary **between**
 * this component and that child. The boundary placement is load-bearing:
 * mounting renders never subscribe the source — the fetch starts when the
 * component calling this hook commits (or via
 * {@link preloadObservablePromise}) — and a suspended component never
 * commits. Without a boundary in between, the child's suspension propagates
 * to the hook caller itself and the fetch can never start.
 *
 * Swapping to a new observable on a consumer that is already live follows
 * React's canonical refetch pattern: change the observable inside
 * [`startTransition`](https://react.dev/reference/react/use#re-fetching-data-in-client-components)
 * (or behind `useDeferredValue`) and the previous content stays visible while
 * the new data loads — no preload required. A suspended transition render
 * never commits, so for exactly this case the hook starts the new source
 * during that render (the live-swap eager start): only consumers that are
 * already committed and visible — and not `disabled` — qualify, which is
 * what keeps mounts, server rendering, `disabled` consumers, and hidden
 * `<Activity>` pre-renders fully lazy. A transition abandoned after the swap render can
 * therefore have started a fetch nobody consumes — the entry settles and
 * evicts after `ttl`, but bound never-settling sources with RxJS `timeout`
 * just as you would for {@link preloadObservablePromise}.
 *
 * For the same reason, never call `use()` on the promise in the same
 * component that called this hook: the component suspends on its own pending
 * promise before the commit that would start the fetch — wrong usage in the
 * same way as `use()`-ing a promise created during your own render, and
 * intentionally not guarded against.
 *
 * A hidden `<Activity>` tree pre-rendering this hook is fully paused: no
 * fetching happens until it is revealed (effects mount) or something else
 * warms the entry. To pre-render hidden content *with* data, call the hook in
 * a visible parent and pass the promise into the hidden tree, where
 * `use(promise)` lets React suspend/resume the pre-render on its own terms.
 *
 * Client components only. On the server the observable is never subscribed —
 * the promise stays pending, server rendering emits the Suspense fallback,
 * and the fetch starts on the client once the hydrated component commits
 * ({@link preloadObservablePromise} is likewise a no-op on the server).
 * react-rx is not a library for React Server Components or server-only data
 * flows; there, fetch with async/await or RxJS `firstValueFrom` and pass the
 * promise as a prop for `use()`.
 *
 * @public
 */
export function useObservablePromise<T>(
  observable: Observable<T>,
  options: UseObservablePromiseOptions = EMPTY_OPTIONS,
): ObservablePromise<T> {
  const {disabled = false, ttl = DEFAULT_HOOK_TTL} = options

  // Pin the cache entry for as long as this component renders this observable
  // identity. A mounted component without a live store subscription (hidden
  // <Activity> tree, disabled consumer) must keep reading its settled promise
  // even if the shared entry is evicted after `ttl` — the same local-reference
  // pattern as `useObservable`.
  const entry: ObservablePromiseEntry<T> = useMemo(
    () => getObservablePromiseEntry(observable),
    [observable],
  )

  // Per-render policy on the pinned entry is metadata only: adopt the max ttl
  // across consumers. Idempotent.
  entry.adoptTtl(ttl)

  // Whether this hook instance is committed and visible. Effects unmount on
  // <Activity> hide and remount on reveal, so hiding clears the flag; because
  // React applies a fiber's pending updates before re-rendering it, a hidden
  // tree's swap render observes `false` even when the hide and the swap land
  // in the same batch. `disabled` is deliberately not part of this: it is
  // enforced at the consumption sites below, which also lets a transition
  // that flips `disabled` off start its fetch from that same render.
  const [live, setLive] = useState(false)
  useEffect(() => {
    // Non-urgent by design: the flag only needs to be true by the time a
    // later swap render reads it, and the swaps that need it are transitions
    // themselves, which React entangles with this pending update. Marking it
    // a transition keeps the extra render off the urgent path.
    startTransition(() => {
      setLive(true)
    })
    return () => {
      // Deliberately synchronous: hiding an <Activity> tree must clear the
      // flag before any later render of the hidden fiber. A sync update is
      // applied ahead of every subsequent render lane; a transition update
      // could be skipped and rebased by an urgent or offscreen render, which
      // would let a hidden swap render fetch.
      setLive(false)
    }
  }, [])

  // Live-swap eager start: a live consumer re-rendered to a new observable
  // starts the new source during that render. This is how React's canonical
  // "swap the source inside startTransition / behind useDeferredValue"
  // refetch pattern asks for data — the swap render suspends before any
  // commit could start the fetch, so without this it would deadlock. Mounts,
  // server renders, disabled consumers, and hidden <Activity> pre-renders
  // are not live and never fetch from render.
  if (!disabled && live) {
    entry.ensureStarted()
  }

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (disabled) {
        return () => {}
      }
      return entry.subscribe(onStoreChange)
    },
    [entry, disabled],
  )

  const getSnapshot = useCallback(() => entry.getPromise(), [entry])

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

/**
 * Warm the promise cache outside of rendering (e.g. `onMouseEnter`, route
 * loaders). Creates or reuses the cache entry, re-arms its retention window,
 * starts the source subscription immediately, and returns the same
 * {@link ObservablePromise} the hook would return for that observable. Not a
 * hook — callable anywhere.
 *
 * This is the mechanism for starting a fetch before any consumer is live:
 * hover/route preloads, data for `<Activity>` pre-renders, or having a swap
 * target already in flight (or settled) before a transition swaps to it —
 * transitions themselves no longer require it, since a live consumer's swap
 * render starts the new source (see {@link useObservablePromise}), but a
 * preload on hover means the swap can commit with no pending period at all.
 *
 * On the server this is a no-op: it returns an inert, forever-pending promise
 * and neither subscribes the observable nor touches the cache. react-rx never
 * subscribes observables on the server (see {@link useObservablePromise}), so
 * a preload in shared/isomorphic code (e.g. a route loader) only takes effect
 * in the browser.
 *
 * Pending entries are never timed out: a never-emitting source keeps the
 * promise pending and the subscription alive until it settles. Bound hang
 * risk with RxJS `timeout` (or cancel the source) when a preload can stall.
 *
 * @public
 */
export function preloadObservablePromise<T>(
  observable: Observable<T>,
  options: PreloadObservablePromiseOptions = EMPTY_OPTIONS,
): ObservablePromise<T> {
  if (IS_SERVER) {
    return asObservablePromise(new ObservablePromiseImpl<T>())
  }
  const {ttl = DEFAULT_PRELOAD_TTL} = options
  const entry = getObservablePromiseEntry(observable)
  entry.warm(ttl)
  return entry.getPromise()
}

export type {ObservablePromise} from './observablePromise'
export {DEFAULT_HOOK_TTL, DEFAULT_PRELOAD_TTL} from './observablePromiseCache'

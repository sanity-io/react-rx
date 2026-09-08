---
"react-rx": major
---

v7 moves every subscription out of the render phase and removes `useObservableEvent`. Requirements are unchanged from v6: React `^19.2`, RxJS `^7.2`, Node `>=22.12`, ESM only. The [v6 to v7 migration guide](https://react-rx.dev/migrate/v6-to-v7) has more patterns.

**`useObservable` and `useSyncObservable` require the `initialValue` argument.** The initial value is what renders until the observable emits. Omitting it is a type error, and because JavaScript callers can bypass the types, the hooks also throw a `TypeError` during render when the argument is missing. Every value is valid, `undefined` included, but you must pass it. Functions act as initializers, like `useState`. To use a function as the initial value, pass an initializer that returns it. The deprecated single-argument overloads are gone.

```tsx
// v6
const users = useObservable(users$)

// v7
const users = useObservable(users$, undefined)
```

Call sites that already pass an `initialValue` keep their behavior. If an observable has no meaningful initial value, use `useObservablePromise` with `use()` and Suspense instead.

**`useObservable` and `useSyncObservable` never subscribe during render.** The render-phase warm-up is gone. Every render, the first one and every identity change alike, shows the resolved `initialValue`, or the shared cache entry's last emission when the observable is already live elsewhere. The subscription starts when the component commits, and a synchronous emission replaces the `initialValue` right after that commit.

- A synchronous emission no longer wins the first paint. v6 subscribed during render when no `initialValue` was given, so `of`, `startWith`, or a `BehaviorSubject` could render on the first pass. In v7 the `initialValue` renders first.
- Swapping to a new observable renders the `initialValue` for one pass. The new observable's synchronous emission arrives after the swap commits. `useObservable` still never renders the previous observable's value under the new identity.
- Observable identities must be stable across renders. Use `useMemo`, `useState`, module scope, or React Compiler memoization. An observable rebuilt on every render is torn down and re-subscribed on every render. When such a source synchronously replays a value that differs from the `initialValue`, every commit forces a re-render and React aborts with "Maximum update depth exceeded". The v6 warm-up let that pattern converge.
- A synchronously erroring observable surfaces its error after commit instead of during render.
- `disabled: true` now always guarantees zero subscriptions. In v6 the warm-up probe still subscribed once when no `initialValue` was given.
- Server rendering renders the resolved `initialValue` and never subscribes. `useSyncObservable` can no longer hit React's "Missing getServerSnapshot" error, and a non-deterministic synchronous emission can no longer cause a hydration mismatch.

**`useObservablePromise` never subscribes during a mounting render.** v6 started the source subscription during render unless `disabled`, so any render fetched as a side effect, hidden `<Activity>` pre-renders included. A fetch now has three triggers.

- A non-`disabled` component that called the hook commits, on mount or on an `<Activity>` reveal.
- A committed, visible, non-`disabled` consumer re-renders with a new observable identity. The hook subscribes the new source during that render, so a suspended transition can settle, retry, and commit.
- Something calls `preloadObservablePromise`.

This affects callers as follows.

- `use(useObservablePromise(obs$))` inside one component deadlocks. The component suspends on its own pending promise before the commit that would start the fetch. This was never a supported pattern and is not guarded against. Pass the promise to a child that reads it with `use()`, and put a `<Suspense>` boundary between the hook caller and that child.
- A hidden `<Activity>` tree that calls the hook is paused. Nothing subscribes until the tree is revealed and its effects mount. To pre-render hidden content with data, call the hook in a visible parent and pass the promise into the hidden tree.
- A synchronously emitting source (`of`, `BehaviorSubject`, a replayed `shareReplay`) resolves at the hook caller's commit, so a cold mount shows one Suspense fallback pass. Preload the observable to skip the fallback.
- Swapping observables inside `startTransition` or behind `useDeferredValue` needs no preload. The live consumer's swap render starts the fetch, the previous content stays visible until the new data settles, and the swap then commits. `preloadObservablePromise` still lets a swap commit with no pending period, for example after a hover preload.
- A live consumer that flips `disabled` off inside a transition starts the fetch from that render.
- A transition abandoned after its swap render can leave a fetch nobody consumes. The entry settles into the shared cache and is evicted after `ttl`. Bound sources that may never settle with RxJS `timeout`, as you would for `preloadObservablePromise`.
- On the server, `preloadObservablePromise` is a no-op that returns an inert pending promise. It neither subscribes nor touches the cache. Server rendering emits the Suspense fallback and the fetch starts after hydration. For React Server Components or server-only flows, fetch with `await` or RxJS `firstValueFrom` and pass the promise or value as a prop.

**`useObservableEvent` is removed.** Replace it with `useObservableSubject`, available since v6.1, which returns the event stream and a stable handler that pushes into it. Then move the pipeline to where its output is consumed. A pipeline that ended in `tap(setState)` becomes a derived stream read with `useObservable` or `useSyncObservable`. A side-effect-only pipeline subscribes in an effect. A pipeline that only forwarded into a `Subject` becomes a direct `next` call.

```tsx
// v6
const [value, setValue] = useState(1)
const handleChange = useObservableEvent((value$) => value$.pipe(map(Number), tap(setValue)))

// v7
const [input$, handleChange] = useObservableSubject<string>()
const value$ = useMemo(() => input$.pipe(map(Number)), [input$])
const value = useSyncObservable(value$, 1)
```

The `use-effect-event` dependency existed only for this hook and is gone. react-rx has no runtime dependencies beyond its `react` and `rxjs` peers.

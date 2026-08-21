---
"react-rx": major
---

**Breaking:** `useObservablePromise` no longer subscribes the source observable during render.

Previously the hook eagerly started the source subscription in the render phase (unless `disabled`), which meant rendering — including hidden `<Activity>` pre-renders — triggered fetching as a side effect. Fetching is now strictly commit-driven or explicit:

- The source subscription starts when a non-`disabled` component that called the hook **commits**, or when `preloadObservablePromise` is called. Rendering alone never subscribes.
- A hidden `<Activity>` tree that calls the hook is fully paused: no subscription, no fetching, until it is revealed and effects mount. To pre-render hidden content _with_ data, call the hook in a visible parent and pass the promise into the hidden tree, where `use(promise)` lets React pre-render and suspend on its own terms.
- `preloadObservablePromise` is the mechanism for warming an entry outside of a commit (hover, route loaders, SSR request handlers, before swapping observables inside a transition). It re-arms the entry's retention window and starts the fetch immediately.

Migration notes:

- `use(useObservablePromise(obs$))` in a single component — never a supported pattern — now deadlocks: the component suspends on its own pending promise before the commit that would start the fetch, the same wrong usage as `use()`-ing a promise created during your own render, and it is intentionally not guarded against. The promise is meant to be passed as a prop to a child that reads it with `use()`, with a `<Suspense>` boundary **between** the hook caller and that child so the caller can commit while the child suspends.
- Synchronously-emitting sources (`of`, `BehaviorSubject`, replayed `shareReplay`) now resolve at the hook caller's commit instead of during render, so a cold mount shows one Suspense fallback pass. Preload the observable to render them without a fallback.
- Swapping to a new observable inside `startTransition` / behind `useDeferredValue` requires warming the new observable first (for example `preloadObservablePromise` in the event handler): a transition render that suspends never commits, so it can no longer start the fetch.
- Server rendering never subscribes the source. Warm entries with `preloadObservablePromise` before rendering to emit data instead of fallbacks.

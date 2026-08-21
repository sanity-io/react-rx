---
"react-rx": major
---

**Breaking:** `useObservablePromise` no longer subscribes the source observable during render.

Previously the hook eagerly started the source subscription in the render phase (unless `disabled`), which meant rendering — including hidden `<Activity>` pre-renders — triggered fetching as a side effect. Fetching is now strictly commit-driven or explicit:

- The source subscription starts when a non-`disabled` component that called the hook **commits**, or when `preloadObservablePromise` is called. Rendering alone never subscribes.
- A hidden `<Activity>` tree that calls the hook is fully paused: no subscription, no fetching, until it is revealed and effects mount. To pre-render hidden content _with_ data, call the hook in a visible parent and pass the promise into the hidden tree, where `use(promise)` lets React pre-render and suspend on its own terms.
- `preloadObservablePromise` is the mechanism for warming an entry outside of a commit (hover, route loaders, SSR request handlers, before swapping observables inside a transition). It re-arms the entry's retention window and starts the fetch immediately.

Migration notes:

- The single-component form `use(useObservablePromise(obs$))` no longer self-starts: the component suspends on its own promise before it can commit, so the promise only settles once the entry is warmed by `preloadObservablePromise` or by another consumer of the same observable. Prefer calling the hook in a component that does not itself suspend, with `use()` in a child below a Suspense boundary.
- Synchronously-emitting sources (`of`, `BehaviorSubject`, replayed `shareReplay`) now resolve at the hook caller's commit instead of during render, so a cold mount shows one Suspense fallback pass. Preload the observable to render them without a fallback.
- Swapping to a new observable inside `startTransition` / behind `useDeferredValue` requires warming the new observable first (for example `preloadObservablePromise` in the event handler): a transition render that suspends never commits, so it can no longer start the fetch.
- Server rendering never subscribes the source. Warm entries with `preloadObservablePromise` before rendering to emit data instead of fallbacks.

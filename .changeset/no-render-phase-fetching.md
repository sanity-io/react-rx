---
"react-rx": major
---

**Breaking:** `useObservablePromise` no longer subscribes the source observable during render.

Previously the hook eagerly started the source subscription in the render phase (unless `disabled`), which meant rendering — including hidden `<Activity>` pre-renders — triggered fetching as a side effect. Fetching is now strictly commit-driven or explicit:

- The source subscription starts when a non-`disabled` component that called the hook **commits**, when an **already-live consumer re-renders with a new observable** (`startTransition` / `useDeferredValue` swaps; the swap render starts the new source so the suspended transition can settle and commit), or when `preloadObservablePromise` is called. Mounting renders and hidden pre-renders never subscribe.
- A hidden `<Activity>` tree that calls the hook is fully paused: no subscription, no fetching, until it is revealed and effects mount. To pre-render hidden content _with_ data, call the hook in a visible parent and pass the promise into the hidden tree, where `use(promise)` lets React pre-render and suspend on its own terms.
- `preloadObservablePromise` is the mechanism for warming an entry before any consumer is live (hover, route loaders, or having a swap target already settled before a transition swaps to it). It re-arms the entry's retention window and starts the fetch immediately, in the browser only (see below).

Migration notes:

- `use(useObservablePromise(obs$))` in a single component — never a supported pattern — now deadlocks: the component suspends on its own pending promise before the commit that would start the fetch, the same wrong usage as `use()`-ing a promise created during your own render, and it is intentionally not guarded against. The promise is meant to be passed as a prop to a child that reads it with `use()`, with a `<Suspense>` boundary **between** the hook caller and that child so the caller can commit while the child suspends.
- Synchronously-emitting sources (`of`, `BehaviorSubject`, replayed `shareReplay`) now resolve at the hook caller's commit instead of during render, so a cold mount shows one Suspense fallback pass. Preload the observable to render them without a fallback.
- Swapping to a new observable inside `startTransition` / behind `useDeferredValue` works like React's promise swaps: the live consumer's swap render starts the fetch, the previous content stays visible until it settles, and the swap then commits. Preloading first, for example on hover, is optional. It means the target can already be in flight or settled by the time the transition renders, which shortens or removes the pending period.
- react-rx is a client-only library and never subscribes observables on the server: server rendering emits the Suspense fallback and the fetch starts after hydration, and `preloadObservablePromise` is now a no-op on the server (an inert pending promise; no subscription, no cache entry). A server-started subscription has no unmount to tear it down, a never-settling source would hang, and the module-scope cache would be shared across requests. For React Server Components or server-only flows, fetch with async/await or RxJS `firstValueFrom` and pass the promise/value as a prop.

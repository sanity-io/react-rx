---
"react-rx": major
---

**`useObservablePromise` now starts a swapped-in observable during the render of an already-live consumer.** React's [client-side refetch pattern](https://react.dev/reference/react/use#re-fetching-data-in-client-components), swapping the data source inside `startTransition` or behind `useDeferredValue`, works without preloading.

A suspended transition render never commits, and commit is otherwise what starts the fetch. A bare observable swap inside a transition therefore used to deadlock silently: the old content stayed up, `isPending` never cleared, no fetch was ever made, and `preloadObservablePromise` in the event handler was mandatory. The fetch now has three triggers:

- **Commit.** A non-`disabled` consumer that called the hook commits (mounts, `<Activity>` reveals). Unchanged.
- **Live-swap render.** A consumer that is already committed, visible, and subscribed re-renders with a new observable identity. The new source is subscribed during that render, so the suspended transition settles, retries, and commits. This is the new trigger, and it makes `startTransition(() => setObservable(next$))` behave like React's promise-swapping examples.
- **`preloadObservablePromise`.** Explicit and render-independent. Transitions no longer require it. It remains the way to warm on hover or in route loaders, so a swap can commit with no pending period, and the way to feed hidden `<Activity>` pre-renders.

Everything that keeps rendering side-effect-free stays lazy: fresh mounts (the Suspense fallback's commit starts the fetch), server rendering, `disabled` consumers, and hidden `<Activity>` trees. Hiding tears down the live subscription, so a hidden tree never qualifies, and swapping observables while hidden stays fully paused.

One consequence: a transition abandoned after its swap render, for example superseded by another swap, can have started a fetch nobody consumes. The entry settles into the shared cache and is evicted after `ttl`. As with `preloadObservablePromise`, cap never-settling sources with RxJS [`timeout`](https://rxjs.dev/api/index/function/timeout) when a stalled fetch is possible.

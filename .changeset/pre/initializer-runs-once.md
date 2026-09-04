---
"react-rx": patch
---

`initialValue` initializers are now resolved once per hook instance, like a `useState` initializer. They previously ran on every pre-emission `getSnapshot` read, so an initializer returning a fresh object (`useObservable(obs$, () => ({...}))`, and the same on `useSyncObservable`) gave `useSyncExternalStore` a new snapshot reference on every consistency check and looped until React aborted with "Maximum update depth exceeded". The resolved value is now cached per instance, which also makes the pre-emission snapshot reference stable across re-renders and fixes the equivalent hazard in `useSyncObservable`'s server snapshot.

As with `useState`, the hook reads the `initialValue` argument on its first render only. A different value passed on a later render is ignored until the hook remounts, where a plain value used to be re-read on every pre-emission render. Keep initializers pure. React Strict Mode calls them twice in development and keeps one result.

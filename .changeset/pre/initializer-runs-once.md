---
"react-rx": patch
---

`initialValue` initializers now run exactly once per hook instance, matching `useState`. They previously ran on every pre-emission `getSnapshot` read, so an initializer returning a fresh object (`useObservable(obs$, () => ({...}))`, and the same on `useSyncObservable`) gave `useSyncExternalStore` a new snapshot reference on every consistency check and looped until React aborted with "Maximum update depth exceeded". The resolved value is now cached per instance, which also makes the pre-emission snapshot reference stable across re-renders and fixes the equivalent hazard in `useSyncObservable`'s server snapshot.

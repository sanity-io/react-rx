---
"react-rx": major
---

**BREAKING:** `useObservable` now defers store updates with `useDeferredValue` — urgent renders keep the previous value while a background render catches up. Mounts, remounts, and `<Activity>` reveals still render the current snapshot synchronously (no initial-value flash). SSR renders synchronous emissions (instead of always using `initialValue`), no longer throws when `initialValue` is omitted, and fails the server render on synchronously erroring observables.

New `useSyncObservable` preserves v4's synchronous behavior and strict `getServerSnapshot` contract — use it for controlled inputs, or rename wholesale for a mechanical migration.

See the [v4 to v5 migration guide](https://react-rx.dev/migrate/v4-to-v5).

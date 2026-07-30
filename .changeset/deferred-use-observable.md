---
"react-rx": major
---

**BREAKING:** `useObservable` now defers store updates with `useDeferredValue` — urgent renders keep the previous value while a background render catches up. Mounts, remounts, and `<Activity>` reveals still render the current snapshot synchronously (no initial-value flash). SSR now renders exactly what the first client render would show (synchronous emissions win over the `initialValue`) and no longer throws when `initialValue` is omitted; synchronously erroring observables now fail the server render instead of masking the error until hydration.

New `useSyncObservable` preserves the exact v4 synchronous behavior, including the strict `getServerSnapshot` contract — switch to it for values feeding controlled inputs or strict server markup control (or rename wholesale for a mechanical migration).

See the [v4 to v5 migration guide](https://react-rx.dev/migrate/v4-to-v5).

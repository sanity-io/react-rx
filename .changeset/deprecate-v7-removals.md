---
"react-rx": minor
---

Deprecate the APIs that react-rx v7 removes, so editors and `no-deprecated` lint rules flag them ahead of the upgrade. Runtime behavior is unchanged.

- `useObservableEvent` is removed in v7. Push events into a `Subject` you own and read the derived stream with `useObservable` or `useSyncObservable`.
- Calling `useObservable` or `useSyncObservable` without an `initialValue` is removed in v7, where the argument is required. `useObservable(observable$, undefined)` keeps the v6 type and behavior. `no-deprecated` lint rules also flag uncalled references such as `typeof useObservable`, because they read the tags of every overload. Those are false positives. Suppress them locally.

See the [v6 to v7 migration guide](https://react-rx.dev/migrate/v6-to-v7).

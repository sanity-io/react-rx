---
"react-rx": minor
---

Deprecate the APIs that react-rx v7 removes, so editors and `no-deprecated` lint rules flag them ahead of the upgrade. Runtime behavior is unchanged.

- `useObservableEvent` is removed in v7. Push events into a `Subject` you own. Call `subject.next(event)` from the handler and read the derived stream with `useObservable` or `useSyncObservable`, or subscribe side-effect-only pipelines in an effect.

See the [v6 to v7 migration guide](https://react-rx.dev/migrate/v6-to-v7).

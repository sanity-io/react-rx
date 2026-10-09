---
'react-rx': major
---

**Do not release on the current recommendation.** This entry is the changelog text the prototype would need if the breaking change shipped. The pull request recommends keeping the v7 freeze and closing this without merging.

`useObservable` and `useSyncObservable` re-resolve `initialValue` when the observable identity changes. While that identity is stable, the argument is still read on the first render only, same as v7 (#579).

This is a breaking change. v7 looped when an observable rebuilt on every render synchronously replayed a value that was not `Object.is` to the initial value captured at mount. That loop remains. Re-resolving adds another: the same churn now also loops when the replay still matches the mount-time initial value but the placeholder resolved for the new identity does not (`useObservable(rebuilt$, nextPlaceholder)` over a source that replays the first placeholder). A fresh object or array on its own does not loop when the source does not emit synchronously. Memoize a placeholder that must stay `Object.is` to the replay. `useCallback` on a factory does not help when the factory returns a new reference.

A synchronous emission still replaces the initial value after commit, and a shared cache entry that has already emitted still wins over `initialValue`. Server rendering still paints the resolved initial value and still does not subscribe. `useSyncObservable`'s server snapshot is still that resolved value even when a shared entry has already emitted.

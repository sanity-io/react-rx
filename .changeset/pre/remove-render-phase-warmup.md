---
'react-rx': major
---

**Breaking:** `useObservable` and `useSyncObservable` never subscribe the observable during render — the render-phase warm-up is gone.

With `initialValue` required there is always something to render, so the internal warm-up machinery (the per-hook tracker and the eager render-phase probe that captured synchronous emissions for replacement observables) has been removed entirely. Every render — the first one and every identity change alike — shows the resolved `initialValue` (or the shared cache entry's last emission when the observable is already live elsewhere), and the source is only ever subscribed by the store subscription when the component commits.

What this changes:

- **Identity swaps render the `initialValue` for one pass.** Swapping to a new observable no longer surfaces its synchronous emission during the swap render; the emission arrives right after the swap commits. The identity-coherent deferral in `useObservable` is unchanged: the previous observable's value never renders under the new identity.
- **Observable identities must be stable across renders** (`useMemo`, `useState`, module scope — or React Compiler memoization, which does this automatically). Like `useSyncExternalStore`'s `subscribe`, an observable rebuilt on every render is torn down and re-subscribed on every render. Previously the warm-up let that pattern converge; now, when such a source synchronously replays a value that differs from the `initialValue`, every commit forces a re-render that builds yet another identity and the component loops until React aborts with "Maximum update depth exceeded". Sanity's `useCanInviteMembers`-style call sites (`enabled ? store.getGrants().pipe(map(...)) : of(false)` with no memoization) need a `useMemo`.
- **Synchronously erroring observables surface their error after commit** (from the store subscription via `getSnapshot` on the forced re-render) instead of during the render that used to warm them up.
- `disabled: true` now guarantees zero subscriptions in every case (previously the warm-up probe still subscribed once when no `initialValue` was given), and server rendering uniformly paints the resolved `initialValue` without subscribing — `useSyncObservable` no longer hits React's "Missing getServerSnapshot" error, and non-deterministic synchronous emissions can no longer cause hydration mismatches. Both fall out of the one rule instead of being special cases.

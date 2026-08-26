---
"react-rx": patch
---

Track `useObservablePromise`'s live-consumer flag with a visibility effect (`useEffect` + `useState`) instead of setting state from the `useSyncExternalStore` subscribe cycle. `subscribe` is subscription-only again, matching its documented contract, and the flag now follows plain effect mount and cleanup semantics, which `<Activity>` hide and reveal already drive. Setting the flag is marked as a transition so the extra render stays off the urgent path; clearing it on hide stays synchronous, so a hidden tree's swap render is guaranteed to observe the cleared flag. No behavior change. Identity swaps no longer even flicker the flag, since the effect only depends on `disabled`.

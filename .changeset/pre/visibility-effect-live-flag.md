---
"react-rx": patch
---

Track `useObservablePromise`'s committed-and-visible flag with a dependency-free visibility effect (`useEffect` + `useState`) instead of setting state from the `useSyncExternalStore` subscribe cycle. `subscribe` is subscription-only again, matching its documented contract, and the flag follows plain effect mount and cleanup semantics, which `<Activity>` hide and reveal already drive. Setting the flag is marked as a transition so the extra render stays off the urgent path; clearing it on hide stays synchronous, so a hidden tree's swap render is guaranteed to observe the cleared flag. `disabled` is enforced at the consumption sites rather than in the effect, which fixes one wedge: flipping `disabled` off inside a transition now starts the fetch from that same render instead of suspending on a source nothing had started.

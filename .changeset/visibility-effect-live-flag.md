---
"react-rx": patch
---

Track `useObservablePromise`'s live-consumer flag with a visibility effect (`useEffect` + `useState`) instead of setting state from the `useSyncExternalStore` subscribe cycle. `subscribe` is subscription-only again, matching its documented contract, and the flag now follows plain effect mount/cleanup semantics — which `<Activity>` hide/reveal already drives. No behavior change; identity swaps no longer even flicker the flag, since the effect only depends on `disabled`.

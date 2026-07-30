---
"react-rx": patch
---

Deduplicate the internals of `useObservable` and `useSyncObservable` into shared modules. The two hooks now share a single observable cache, so observing the same observable with both hooks reuses one shared source subscription and snapshot instead of two.

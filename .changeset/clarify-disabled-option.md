---
"react-rx": patch
---

Clarify that `useObservable`'s `disabled` option pauses the live store subscription (and keeps returning the last value) but does not skip the render-phase warm-up subscription. Document swapping the observable when zero subscriptions are required.

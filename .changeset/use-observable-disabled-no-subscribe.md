---
"react-rx": patch
---

Honor the `disabled` option on `useObservable`: when `disabled: true`, the hook no longer performs its eager render-phase subscription (previously it still subscribed once during render, contradicting the documented contract). Subscription starts only once `disabled` becomes `false`.

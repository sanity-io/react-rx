---
'react-rx': patch
---

fix: make `useObservable` deferral identity-coherent. The observable identity and its value are now deferred as one snapshot, and when the observable identity changes (e.g. it is memoized on a document id that just changed) the hook falls back to the live value — so the previous identity's value never renders under the new one.

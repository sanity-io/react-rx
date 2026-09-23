---
'react-rx': patch
---

Fix infinite recursion in `useObservablePromise` on Hermes (React Native), which ignores `Symbol.species` when `.then()` builds a derived promise.

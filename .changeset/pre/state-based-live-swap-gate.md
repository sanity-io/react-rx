---
"react-rx": patch
---

Track `useObservablePromise`'s live-swap gate with React state instead of a ref. No behavior change. The flag is written from the store subscription's commit-phase setup and teardown and read as regular state during render, which removes the ref-read-in-render rules exception and lets the React Compiler optimize the hook again. State-queue ordering also guarantees a hidden tree's swap render observes the torn-down subscription even when a hide and a swap land in the same update batch.

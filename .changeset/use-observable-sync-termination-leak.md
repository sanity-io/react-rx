---
"react-rx": patch
---

Fix a `useObservable` cache leak for observables that complete or error synchronously on subscribe. Stale entries could retain snapshots (or replay errors) indefinitely on server renders, `disabled` hooks, and renders that throw before commit.

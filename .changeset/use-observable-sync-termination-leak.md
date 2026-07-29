---
"react-rx": patch
---

Fix a `useObservable` memory leak where observables that complete or error synchronously upon subscription (e.g. `of(...)`, a replayed-and-completed `shareReplay(1)`, a synchronous `throwError`) left a permanent entry in the internal cache, retaining the last emitted snapshot (or error) for as long as the source observable stayed alive. In the synchronous error case the leaked entry also replayed the stale error on every later mount instead of re-subscribing the source, turning transient errors permanent.

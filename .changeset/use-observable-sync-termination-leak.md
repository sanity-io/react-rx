---
"react-rx": patch
---

Fix a `useObservable` memory leak where observables that complete or error synchronously upon subscription (e.g. `of(...)`, a replayed-and-completed `shareReplay(1)`, a synchronous `throwError`) left an entry in the internal cache that its own teardown could no longer evict. A later committed mount of the same observable would clean the entry up as a side effect, but that never happens for server renders, `disabled` hooks, or renders that throw before commit — there the entry retained the last emitted snapshot (or error) for as long as the source observable itself stayed alive. In the synchronous error case the stale entry also replayed the old error on later mounts instead of re-subscribing the source, turning transient errors permanent.

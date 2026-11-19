---
'react-rx': patch
---

Document that `useObservable` / `useSyncObservable` unsubscribe while inside a hidden `<Activity>`, so plain `Subject`s and other non-replaying sources drop values emitted while hidden; replaying sources (`BehaviorSubject`, `shareReplay({bufferSize: 1, refCount: true})`, …) resync on reveal.

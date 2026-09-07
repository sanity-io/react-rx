---
"react-rx": minor
---

Add `useObservableSubject`, a hook that returns the two halves of an event: an observable of the values pushed into it, and a referentially stable handler that pushes them. The underlying RxJS `Subject` is scoped to the component instance and only its observable side is exposed.

```tsx
const [events$, handleEvent] = useObservableSubject<string>()
const value$ = useMemo(() => events$.pipe(map(Number)), [events$])
const value = useSyncObservable(value$, 1)
// <input value={value} onChange={(event) => handleEvent(event.currentTarget.value)} />
```

`useObservableEvent` is removed in v7. It is now implemented on top of `useObservableSubject`, which carries over to v7 unchanged, so call sites can be migrated on v6 and need no further changes after upgrading.

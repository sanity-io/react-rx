---
'react-rx': minor
---

Add `createObservableCache`, a keyed cache of shared observables for request-like sources. Every
caller of a key gets the same observable, which is what lets them share one request — and, since
`useObservablePromise` caches its promise per observable identity, one settled promise. A sibling or
a remount then renders the loaded value instead of suspending again, where an observable built per
component (`useMemo(() => fetchUser(id), [id])`) makes every consumer fetch and suspend on its own.

```tsx
const users = createObservableCache(fetchUser, {ttl: USER_TTL})
// const promise = useObservablePromise(users(id), {ttl: USER_TTL})
```

Keys are plain strings. A key is released `ttl` after its last subscriber leaves — the same `ttl` an
abandoned request keeps running for, and the window an entry nothing ever subscribed to gets.
A request that produces no value at all is a failure, and failures are never cached (`EmptyError`,
as in `firstValueFrom`). The cached observable ends at the first value and then stays open, so take
it with `first()` / `firstValueFrom` rather than an operator that waits for completion, and expect
one value per key — anything emitted or thrown after the result is truncated rather than pushed at
subscribers who already settled. `clear()` forgets every key at once. See the
[reference](https://react-rx.dev/reference#createobservablecache) for how this `ttl` nests with the
hook's, and for choosing one that does not keep a Node process alive.

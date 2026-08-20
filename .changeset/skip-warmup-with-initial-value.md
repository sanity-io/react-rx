---
'react-rx': minor
---

`useObservable` and `useSyncObservable` no longer perform the eager render-phase warm-up subscription when an `initialValue` is provided. The warm-up exists so observables that emit synchronously (`startWith`, `of`, a `BehaviorSubject`, …) can be rendered from the very first render — but with an `initialValue` there is already a value to paint, so the source is now left untouched until the live store subscription starts on commit.

What changes when an `initialValue` is passed:

- Subscribe-time side effects (for example a `fromFetch` request) no longer run during render — the source is first subscribed on commit.
- `disabled: true` now guarantees zero subscriptions (previously the warm-up still subscribed the source once during render).
- Server rendering paints the resolved `initialValue` (matching the client's first paint) and never subscribes the source; synchronously erroring observables no longer fail the server render — the error surfaces on the client once the subscription starts.
- A synchronous emission reaches the component right after mount instead of during the first render: the first paint shows the `initialValue`.

Omitting the `initialValue` keeps the previous behavior: the hook still briefly subscribes during render so a synchronous emission can be returned from the very first render.

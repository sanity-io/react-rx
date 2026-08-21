---
'react-rx': minor
---

Skip the render-phase warm-up subscription in `useObservable`/`useSyncObservable` when an `initialValue` is provided. The warm-up only exists so sync emissions (`startWith`, `of`, …) can render on the first paint — with an `initialValue` there's already a value to show, so the observable is now first subscribed on commit. Subscribe-time side effects (e.g. `fromFetch`) stay out of the render phase, `disabled: true` now means zero subscriptions (even when the observable is rebuilt every render), and SSR paints the `initialValue` without subscribing the source. Once the hook has received an emission, replacement observables on later renders are warmed during render again so components that rebuild the observable every render settle instead of looping. Omitting `initialValue` behaves exactly as before.

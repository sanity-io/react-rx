---
'react-rx': minor
---

Skip the render-phase warm-up subscription in `useObservable`/`useSyncObservable` when an `initialValue` is provided. The warm-up only exists so sync emissions (`startWith`, `of`, …) can render on the first paint — with an `initialValue` there's already a value to show, so the source is now first subscribed on commit. Subscribe-time side effects (e.g. `fromFetch`) stay out of the render phase, `disabled: true` now means zero subscriptions, and SSR paints the `initialValue` without subscribing the source. Omitting `initialValue` behaves exactly as before.

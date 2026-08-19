---
'react-rx': minor
---

fix: pace `useObservable` emission delivery to React's render cycle

React must restart an in-flight concurrent render pass (Suspense retries, lazy mounts, transitions) whenever a `useSyncExternalStore` snapshot changes mid-pass, so a source that emits faster than the pass can complete used to restart it on every emission and starve it forever — the UI stalled until the emission pressure stopped.

`useObservable` now paces delivery: a value is delivered immediately when React is quiet (isolated emissions have zero added latency, and synchronous first values at mount are unchanged), and while a delivered value is still being rendered, newer emissions are held with only the latest delivered once the main thread goes idle again (`requestIdleCallback`, which fires only after the pass commits). This bounds pass restarts to one per commit cycle and guarantees forward progress under emission pressure.

Note the contract change: emission bursts coalesce, so intermediate values may never render through `useObservable`. Use `useSyncObservable` when every emission must be delivered synchronously.

In environments without `requestIdleCallback` (jsdom, older Safari) pacing falls back to `setTimeout(0)`, which coalesces per macrotask but is not a true idle signal.

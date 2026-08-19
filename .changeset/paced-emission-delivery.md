---
'react-rx': minor
---

fix: pace `useObservable` emission delivery to React's render cycle

React must restart an in-flight concurrent render pass (Suspense retries, lazy mounts, transitions) whenever a `useSyncExternalStore` snapshot changes mid-pass, so a source that emits faster than the pass can complete used to restart it on every emission and starve it forever — the UI stalled until the emission pressure stopped.

`useObservable` now paces delivery: emissions are delivered synchronously while React cannot be rendering (nothing pending, or arriving in the same microtask as the last delivery — React paints only the last value of a task either way), and emissions arriving later while a delivered value may still be rendering are held, with only the latest delivered once the main thread goes idle again (`requestIdleCallback`, which fires only after the pass commits). This bounds pass restarts to one per commit cycle and guarantees forward progress under emission pressure.

Synchronous bursts and isolated emissions are delivered as if unpaced, so mount semantics and same-task behavior are unchanged. The contract change is limited to emissions spread across tasks while a delivery is pending: those coalesce, and intermediate values may never render through `useObservable`. Use `useSyncObservable` when every emission must be delivered synchronously.

In environments without `requestIdleCallback` (jsdom, older Safari) pacing falls back to `setTimeout(0)`, which coalesces per macrotask but is not a true idle signal.

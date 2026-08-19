import {Observable} from 'rxjs'
import type {MonoTypeOperatorFunction, Subscription} from 'rxjs'

/**
 * Completes once the main thread goes idle again — i.e. after any in-flight React render pass
 * has committed and the scheduler queue has drained. `requestIdleCallback` is precisely that
 * signal: it does not fire between React's time slices (pending scheduler work means not idle),
 * only after the pass commits. The `timeout` bounds the wait on perpetually-busy pages.
 *
 * The `setTimeout(0)` fallback is *not* an idle signal — it fires between React's time slices —
 * so in environments without `requestIdleCallback` (jsdom, older Safari) pacing degrades to
 * per-macrotask coalescing.
 */
function renderIdle(): Observable<never> {
  return new Observable<never>((subscriber) => {
    if (typeof requestIdleCallback === 'function') {
      const id = requestIdleCallback(() => subscriber.complete(), {timeout: 500})
      return () => cancelIdleCallback(id)
    }
    const id = setTimeout(() => subscriber.complete(), 0)
    return () => clearTimeout(id)
  })
}

/**
 * Paces emission delivery to React's render cycle. Values are delivered synchronously while
 * React cannot be rendering: when no delivery is pending, and for any further emissions in the
 * same microtask as the last delivery (React batches them into one paint either way, so holding
 * them would only expose an earlier value and delay the final one — this keeps synchronous
 * bursts, like a cold source replaying on resubscription, behaving as if unpaced). Once the
 * microtask drains, newer emissions are held with only the latest delivered when the main
 * thread next goes idle (idle = any in-flight render pass committed).
 *
 * React must restart an in-flight concurrent render pass whenever a `useSyncExternalStore`
 * snapshot changes mid-pass, so a source that emits across tasks faster than the pass can
 * complete starves it forever. Holding cross-task emissions until render-idle bounds those
 * restarts to at most one per commit cycle — guaranteeing forward progress under emission
 * pressure — with zero added latency for emissions arriving while React is quiet.
 *
 * @internal
 */
export function paceToRenderIdle<T>(): MonoTypeOperatorFunction<T> {
  return (source) =>
    new Observable<T>((subscriber) => {
      // Non-null from a delivery until the next render-idle: while set, cross-microtask
      // emissions are held. `renderIdle` never completes synchronously, so the assignment in
      // `deliver` always happens before `onIdle` can run.
      let idleWindow: Subscription | null = null
      // True from a delivery until the current microtask drains: emissions arriving
      // synchronously with the last delivery pass through instead of being held.
      let passthrough = false
      let held: {value: T} | null = null
      let sourceComplete = false

      const onIdle = () => {
        idleWindow = null
        if (held) {
          const {value} = held
          held = null
          deliver(value)
        } else if (sourceComplete) {
          subscriber.complete()
        }
      }

      const deliver = (value: T) => {
        if (!passthrough) {
          passthrough = true
          queueMicrotask(() => {
            passthrough = false
          })
        }
        if (!idleWindow) {
          idleWindow = renderIdle().subscribe({complete: onIdle})
        }
        subscriber.next(value)
      }

      const subscription = source.subscribe({
        next: (value) => {
          if (idleWindow && !passthrough) {
            held = {value}
          } else {
            deliver(value)
          }
        },
        error: (error) => subscriber.error(error),
        complete: () => {
          sourceComplete = true
          // With a held value, completion waits for the idle delivery in `onIdle` so the
          // trailing value is not lost.
          if (!held) {
            subscriber.complete()
          }
        },
      })

      return () => {
        subscription.unsubscribe()
        idleWindow?.unsubscribe()
      }
    })
}

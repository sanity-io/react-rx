import {concat, defer, exhaustMap, finalize, Observable, of, Subject, throttle} from 'rxjs'
import type {MonoTypeOperatorFunction, OperatorFunction} from 'rxjs'

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
 * The `rxjs-exhaustmap-with-trailing` implementation, minus its scheduler wrapping of the inner
 * observable. The scheduler guarded against re-entrancy when the inner completes synchronously
 * upon subscription, which cannot happen here — {@link paceToRenderIdle}'s inner always completes
 * asynchronously — and it has to go: the leading edge must stay synchronous so sources that emit
 * synchronously still deliver their first value during the mount render.
 */
function exhaustMapWithTrailing<T, R>(
  project: (value: T, index: number) => Observable<R>,
): OperatorFunction<T, R> {
  return (source) =>
    defer(() => {
      const release = new Subject<void>()
      return source.pipe(
        throttle(() => release, {leading: true, trailing: true}),
        exhaustMap((value, index) => project(value, index).pipe(finalize(() => release.next()))),
      )
    })
}

/**
 * Paces emission delivery to React's render cycle: a value is delivered immediately when React
 * is quiet, and while a delivered value is still being rendered, newer emissions are held with
 * only the latest delivered once the main thread goes idle again (idle = the pass committed).
 *
 * React must restart an in-flight concurrent render pass whenever a `useSyncExternalStore`
 * snapshot changes mid-pass, so a source that emits faster than the pass can complete starves it
 * forever. Pacing bounds those restarts to at most one per commit cycle — guaranteeing forward
 * progress under emission pressure — with zero added latency for isolated emissions.
 *
 * @internal
 */
export function paceToRenderIdle<T>(): MonoTypeOperatorFunction<T> {
  return exhaustMapWithTrailing((value) => concat(of(value), renderIdle()))
}

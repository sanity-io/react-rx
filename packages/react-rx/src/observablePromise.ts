/**
 * A thenable instrumented for React's `use()` / Suspense protocol.
 *
 * React reads `status` / `value` / `reason` synchronously (see
 * `trackUsedThenable` in facebook/react). When `status` is already set,
 * React will not attach its own instrumentation — we own those fields.
 *
 * The protocol needs a thenable, not a `Promise` instance
 * (https://github.com/reactwg/async-react/discussions/3), so this class
 * composes over a plain `Promise` and delegates `then` / `catch` / `finally`
 * to it. Derived promises are therefore plain `Promise`s on every engine.
 * Subclassing `Promise` instead would hand that construction to the engine,
 * and engines without `Symbol.species` (Hermes) build derived promises from
 * `this.constructor` — recursing into this constructor or leaving a
 * half-instrumented instance whose `status` never advances (#626).
 */

function noop() {}

/** @public */
export type ObservablePromise<T> = Promise<T> &
  ({status: 'pending'} | {status: 'fulfilled'; value: T} | {status: 'rejected'; reason: unknown})

/** @internal */
export class ObservablePromiseImpl<T> implements Promise<T> {
  status: 'pending' | 'fulfilled' | 'rejected' = 'pending'
  value?: T
  reason?: unknown

  readonly #promise: Promise<T>
  #resolve!: (value: T | PromiseLike<T>) => void
  #reject!: (reason?: unknown) => void

  constructor() {
    this.#promise = new Promise<T>((resolve, reject) => {
      this.#resolve = resolve
      this.#reject = reject
    })
  }

  get [Symbol.toStringTag](): string {
    return 'ObservablePromise'
  }

  // oxlint-disable-next-line unicorn/no-thenable -- this class exists to be a `use()` thenable
  then<TResult1 = T, TResult2 = never>(
    onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return this.#promise.then(onfulfilled, onrejected)
  }

  catch<TResult = never>(
    onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | null,
  ): Promise<T | TResult> {
    return this.#promise.catch(onrejected)
  }

  finally(onfinally?: (() => void) | null): Promise<T> {
    return this.#promise.finally(onfinally)
  }

  /** Fulfill a pending promise in place (stable identity for Suspense unblock). */
  fulfill(value: T): void {
    if (this.status !== 'pending') {
      return
    }
    this.status = 'fulfilled'
    this.value = value
    this.#resolve(value)
  }

  /** Reject a pending promise in place. */
  rejectWith(reason: unknown): void {
    if (this.status !== 'pending') {
      return
    }
    this.status = 'rejected'
    this.reason = reason
    // Mark the rejection handled before it happens, so a promise nobody
    // consumes (e.g. a preload that never mounts) stays out of
    // unhandled-rejection reporting. Consumers' own `.then()` chains still
    // report normally, as they would on any promise.
    this.#promise.catch(noop)
    this.#reject(reason)
  }

  static fulfilled<T>(value: T): ObservablePromiseImpl<T> {
    const promise = new ObservablePromiseImpl<T>()
    promise.fulfill(value)
    return promise
  }

  static rejected<T = never>(reason: unknown): ObservablePromiseImpl<T> {
    const promise = new ObservablePromiseImpl<T>()
    promise.rejectWith(reason)
    return promise
  }
}

/** @internal */
export function asObservablePromise<T>(promise: ObservablePromiseImpl<T>): ObservablePromise<T> {
  return promise as ObservablePromise<T>
}

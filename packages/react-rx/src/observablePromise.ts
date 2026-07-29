/**
 * A Promise instrumented for React's `use()` / Suspense protocol.
 *
 * React reads `status` / `value` / `reason` synchronously (see
 * `trackUsedThenable` in facebook/react). When `status` is already set,
 * React will not attach its own instrumentation — we own those fields.
 *
 * Implemented as a real `Promise` subclass (recommended in
 * https://github.com/reactwg/async-react/discussions/3). Rejection handlers
 * are attached via `Promise.prototype.then` to avoid subclass species
 * recursion from `this.then(...)` inside the constructor.
 */

function noop() {}

/** @public */
export type ObservablePromise<T> = Promise<T> &
  (
    | {status: 'pending'}
    | {status: 'fulfilled'; value: T}
    | {status: 'rejected'; reason: unknown}
  )

/** @internal */
export class ObservablePromiseImpl<T> extends Promise<T> {
  status: 'pending' | 'fulfilled' | 'rejected' = 'pending'
  value?: T
  reason?: unknown

  #resolve: (value: T | PromiseLike<T>) => void
  #reject: (reason?: unknown) => void

  // Derived `.then()` chains should return plain Promises, not instrumented subclasses.
  static get [Symbol.species]() {
    return Promise
  }

  constructor() {
    let resolve!: (value: T | PromiseLike<T>) => void
    let reject!: (reason?: unknown) => void
    super((res, rej) => {
      resolve = res
      reject = rej
    })
    this.#resolve = resolve
    this.#reject = reject
    // Prevent unhandled-rejection noise if nothing consumes the promise before
    // an error settles (e.g. preload that nobody mounts).
    // Use Promise.prototype.then — `this.then` would construct another subclass
    // instance via @@species and recurse forever.
    Promise.prototype.then.call(this, noop, noop)
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
    this.#reject(reason)
  }

  static fulfilled<T>(value: T): ObservablePromiseImpl<T> {
    const promise = new ObservablePromiseImpl<T>()
    promise.fulfill(value)
    return promise
  }

  static rejected(reason: unknown): ObservablePromiseImpl<never> {
    const promise = new ObservablePromiseImpl<never>()
    promise.rejectWith(reason)
    return promise
  }
}

/** @internal */
export function asObservablePromise<T>(promise: ObservablePromiseImpl<T>): ObservablePromise<T> {
  return promise as ObservablePromise<T>
}

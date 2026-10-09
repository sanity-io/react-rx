/**
 * Vitest setup: install the `Promise.prototype.then` React Native runs on Hermes.
 *
 * Hermes does not implement `Symbol.species`, and React Native replaces the
 * global `Promise` with the `then/promise` polyfill, whose `then` builds the
 * derived promise from `this.constructor`. There is no `SpeciesConstructor`
 * step that could send a `Promise` subclass back to plain `Promise`, so on
 * such an engine `.then()` on a subclass instance constructs the subclass
 * again, with the engine's executor. Reproducing that on V8 lets the regular
 * suites catch what would otherwise only surface on a device: unbounded
 * constructor recursion (#626), or engine-built instances whose `status`
 * never advances and leave `use()` suspended forever.
 *
 * Plain promises take the native path unchanged, so the rest of the test
 * environment is unaffected.
 */

// oxlint-disable-next-line typescript/unbound-method -- captured to be invoked with an explicit receiver below
const nativeThen = Promise.prototype.then

// oxlint-disable-next-line no-extend-native, unicorn/no-thenable -- modelling an engine's `then` is the point of this file
Promise.prototype.then = function hermesThen<TResult1, TResult2>(
  this: Promise<unknown>,
  onfulfilled?: ((value: unknown) => TResult1 | PromiseLike<TResult1>) | null,
  onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
): Promise<TResult1 | TResult2> {
  const Ctor: unknown = this.constructor
  if (typeof Ctor !== 'function' || Ctor === Promise) {
    return nativeThen.call(this, onfulfilled, onrejected) as Promise<TResult1 | TResult2>
  }
  // then/promise `safeThen`: `new self.constructor(executor)`, where the
  // executor forwards a plain derived promise into the new instance.
  return new (Ctor as PromiseConstructor)<TResult1 | TResult2>((resolve, reject) => {
    const derived = nativeThen.call(this, onfulfilled, onrejected) as Promise<TResult1 | TResult2>
    derived.then(resolve, reject)
  })
}

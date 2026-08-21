export const EMPTY_OBJECT: Readonly<Record<string, never>> = Object.freeze({})

/**
 * Sentinel representing an omitted `initialValue` argument. Every value a caller can produce —
 * `undefined` included — is a valid initial value, so omission is detected by argument arity and
 * modeled with a symbol user code cannot accidentally pass. Registered with `Symbol.for()` so
 * duplicate copies of react-rx in one module graph agree on the sentinel.
 *
 * @internal
 */
export const UNSET_INITIAL_VALUE: unique symbol = Symbol.for('react-rx.unsetInitialValue')

/** @internal */
export function missingInitialValueError(hookName: string): TypeError {
  return new TypeError(
    `${hookName} requires an initialValue: it is rendered until the observable emits. ` +
      'Any value is valid, `undefined` included — pass it explicitly. Functions act as ' +
      "initializers, like React's `useState`: pass `() => value` to compute the initial value " +
      'lazily, and an initializer returning the function when the initial value is a function ' +
      'itself. If the observable has no meaningful initial value, use `useObservablePromise` ' +
      'to suspend with `use()` until the first emission instead.',
  )
}

export function getValue<T>(value: T): T extends () => infer U ? U : T {
  return (typeof value === 'function' ? (value as () => any)() : value) as T extends () => infer U
    ? U
    : T
}

export const EMPTY_OBJECT: Readonly<Record<string, never>> = Object.freeze({})

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

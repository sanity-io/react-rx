import {useRef, useState} from 'react'

/**
 * Resolve a `useState`-style initial value. Functions are initializers; every other value,
 * `undefined` included, is used as-is. To seed the hook with a function, pass an initializer
 * that returns it.
 *
 * @internal
 */
function resolveInitialValue<InitialValue>(
  initialValue: InitialValue | (() => InitialValue),
): InitialValue {
  return typeof initialValue === 'function' ? (initialValue as () => InitialValue)() : initialValue
}

/**
 * The value `getSnapshot` returns until the observable emits, cached per observable identity.
 *
 * `useSyncExternalStore` compares snapshots with `Object.is` and may call `getSnapshot` more
 * than once per render. The initializer therefore runs here, during render, and the result is
 * reused for every read of that identity. Invoking it inside `getSnapshot` (the pre-#579
 * behavior) makes a fresh object look like a store change on every consistency check.
 *
 * While `observable` is stable, later renders ignore `initialValue`. A new `{}`, `[]`, or
 * `() => ({...})` cannot loop. When the identity changes, the argument is resolved once for
 * that identity so a placeholder that depends on the same inputs as the observable (a document
 * id, a settings default) replaces the previous placeholder instead of sticking for the life
 * of the hook.
 *
 * The cache lives in a ref written during render, not in `setState`. Adjusting state during
 * render restarts the component, and a restart that allocates a new observable
 * (`new Subject()` in the same function) never converges. The ref update does not schedule
 * that restart: a primitive or otherwise `Object.is`-stable initial value still tolerates an
 * unstable observable that does not synchronously replay a different value.
 *
 * The mount value goes through `useState` so React Strict Mode's double-invoked initializer
 * keeps one reference, matching the v7 contract. Identity changes after mount resolve in the
 * ref; Strict Mode may call that initializer twice and keep the second result.
 *
 * @internal
 */
export function useResolvedInitialValue<InitialValue>(
  observable: object,
  initialValue: InitialValue | (() => InitialValue),
): InitialValue {
  const [resolvedOnMount] = useState(() => resolveInitialValue(initialValue))
  const slot = useRef<{observable: object; value: InitialValue} | null>(null)

  // The ref is the render-time cache. `setState` during render would restart the component,
  // and a restart that allocates a new observable (`new Subject()` in the same function) never
  // converges — including for a primitive initial value, which today does not loop.
  // The returned value is itself the ref read, so the suppression covers the return as well.
  /* oxlint-disable react/refs -- render-time cache; see the comment above */
  if (slot.current === null) {
    slot.current = {observable, value: resolvedOnMount}
  } else if (slot.current.observable !== observable) {
    slot.current = {observable, value: resolveInitialValue(initialValue)}
  }
  return slot.current.value
  /* oxlint-enable react/refs */
}

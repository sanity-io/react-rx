import {useCallback, useInsertionEffect, useRef} from 'react'

// Vendored from `use-effect-event@1.0.2`:
// https://github.com/sanity-io/use-effect-event/blob/v1.0.2/src/useEffectEvent.ts
// React Compiler only leaves `useEffectEvent` out of the dependencies it infers
// when the hook is React's own. Any other implementation is treated as an
// ordinary value, so its identity has to be stable across renders or every memo
// block and effect that closes over it invalidates on each render. React's
// native hook and `use-effect-event@2` both return a fresh function per render,
// which is safe for the native hook and not for a ponyfill; the `useCallback`
// wrapper below is what keeps this one usable under the compiler.
//
// TODO: switch to `useEffectEvent` from `react` once
// https://github.com/facebook/react/issues/34818 is fixed in the lowest React
// version we support. React 19.2 keeps first-render values when the calling
// component is wrapped in `forwardRef` or `memo`.
/** @internal */
export function useEffectEvent<const T extends (...args: any[]) => void>(fn: T): T {
  const ref = useRef<T | null>(null)
  useInsertionEffect(() => {
    ref.current = fn
  }, [fn])
  return useCallback((...args: any) => {
    const latestFn = ref.current!
    return latestFn(...args)
  }, []) as unknown as T
}

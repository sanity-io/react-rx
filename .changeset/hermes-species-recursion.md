---
'react-rx': patch
---

Fix `useObservablePromise` and `preloadObservablePromise` on Hermes (React Native), where creating the promise crashed with `Maximum call stack size exceeded`. Hermes does not implement `Symbol.species`, so `.then()` on a `Promise` subclass built another instrumented instance and recursed in the constructor. The returned `ObservablePromise` no longer subclasses `Promise`: it is a thenable that wraps a plain promise and delegates `then` / `catch` / `finally` to it, so derived promises are plain `Promise`s on every engine and `use(promise.then(fn))` settles instead of suspending forever. It still satisfies the `ObservablePromise<T>` type and works with `use()`, `await` and the `Promise` combinators, but `instanceof Promise` is now `false`.

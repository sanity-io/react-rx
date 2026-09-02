---
'react-rx': major
---

**Breaking:** `useObservable` and `useSyncObservable` now require the `initialValue` argument.

The initial value is what renders until the observable emits. Omitting the argument is a type error, and — since JavaScript callers can bypass the types — the hooks also detect a missing argument at runtime (by argument arity) and throw during render.

The rules for what counts as a valid `initialValue`:

- **Every value is valid, `undefined` included** — but it must be passed explicitly: `useObservable(value$, undefined)` renders `undefined` until the first emission, while `useObservable(value$)` throws.
- **Functions act as initializers**, exactly like `useState`: `useObservable(value$, () => expensiveInitial())` computes the initial value lazily. To use a function itself as the initial value, pass an initializer that returns it: `useObservable(fn$, () => myFunction)`.

Migration:

- Call sites that already pass an `initialValue` are unaffected, including their runtime behavior.
- For call sites that relied on `undefined` being the implicit initial value, pass it explicitly: `useObservable(value$)` → `useObservable(value$, undefined)`.
- Call sites that relied on the render-phase warm-up subscription (with no `initialValue`, a synchronous emission — e.g. from `of`, `startWith`, or a `BehaviorSubject` — used to be returned from the very first render): the warm-up is gone. The first render shows the `initialValue` and the synchronous emission replaces it right after mount, in the same paint cycle as with any other emission. If an observable has no initial value that makes sense, or you want fallback UI while the observable is "loading", use `useObservablePromise` with `use()` and Suspense instead.

Requiring an initial value is also what enables the other breaking change to these hooks: with something to render on every pass, the observable never needs to be subscribed during render — see the render-phase warm-up removal in this release for what that changes.

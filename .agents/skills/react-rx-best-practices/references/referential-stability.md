# Referential Stability

react-rx keys its internal caches (subscription sharing, warm snapshots, promise entries) in a
`WeakMap` by the **observable's reference identity**. Two consequences:

- The **same** observable reference across renders/components → one shared subscription, snapshots
  survive remounts and `<Activity>` hide/show.
- A **new** observable reference every render → resubscribe every render. Symptoms: refetch loops,
  state resetting on every keystroke, `useObservablePromise` stuck showing its fallback forever
  (every render creates a new pending promise), interval timers restarting from zero.

If a review finds an observable created inline in a component body without one of the guarantees
below, that is a bug even if it happens to work today.

## Ways to guarantee stability (in order of preference)

1. **Module scope / owned by a store.** Best for app-wide streams:

   ```tsx
   const messages$ = socket$.pipe(scan(appendMessage, []))
   ```

2. **`useState` initializer** for per-component-instance subjects and streams:

   ```tsx
   const [query$] = useState(() => new Subject<string>())
   ```

3. **`useMemo` with genuinely stable deps** for observables derived from props:

   ```tsx
   const doc$ = useMemo(() => store.observe(documentId), [store, documentId])
   ```

   Every dep must itself be stable — a `client` recreated per render upstream poisons every
   `useMemo` downstream. Trace the chain.

4. **React Compiler.** If the project compiles with the React Compiler, inline construction is
   auto-memoized and rule 3 is satisfied without hand-written `useMemo`.

## Detecting the React Compiler

Before flagging a bare inline observable as unstable, check whether the compiler is on:

- `babel-plugin-react-compiler` in `package.json` (dependencies or devDependencies), a babel config,
  or a bundler's babel plugin list (Vite `@vitejs/plugin-react` `babel.plugins`, `@rolldown/plugin-babel`, …)
- Next.js: `reactCompiler: true` (or `experimental.reactCompiler` on older versions) in `next.config.*`
- `eslint-plugin-react-hooks` with the `react-compiler` rule enabled (signals intent, not proof)
- Per-file opt-outs: a `"use no memo"` directive disables the compiler for that file — treat those
  files as *not* compiled and require explicit memoization there

If the compiler is enabled, do not add redundant `useMemo` wrappers around observable construction —
that's noise the compiler already handles. If it isn't, one of rules 1–3 must hold.

## Stabilize params and initial values by value

Identity bugs hide one level up, in the *inputs*:

```tsx
// ❌ The caller passes a fresh [] every render → memo key changes → observable recreated forever
useListeningQuery(query, {params, initialValue: []})
```

Stabilize object-ish inputs by value before they enter a `useMemo` dep list. Two proven patterns:

```tsx
// JSON round-trip (fine for small plain-data params)
function useStableValue<T>(value: T): T {
  const json = useMemo(() => JSON.stringify(value ?? null), [value])
  return useMemo(() => JSON.parse(json), [json])
}
```

```tsx
// Deep-equal state (keeps the previous reference until the value actually changes)
const [stableInitialValue, setStableInitialValue] = useState(initialValue)
if (!isEqual(stableInitialValue, initialValue)) {
  setStableInitialValue(initialValue)
}
```

The second form is render-safe (React re-renders immediately with the new state) and preserves
reference equality for downstream `distinctUntilChanged(isEqual)` / memo checks.

## Related: `initialValue` and `disabled` are not stability tools

- `initialValue` only fills in before the first emission; it does not protect against identity
  churn — a recreated observable resets to `initialValue` every render.
- `disabled: true` pauses the live subscription but the render-phase warm-up subscribe still runs.
  To guarantee an observable is never subscribed, swap it out (`shouldFetch ? fetch$ : of(null)`)
  instead of disabling the hook.

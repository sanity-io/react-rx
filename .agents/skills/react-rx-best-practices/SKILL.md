---
name: react-rx-best-practices
description: >
  Decide when and how to read RxJS observables from React with react-rx (v5+). Use this skill when
  writing, reviewing, refactoring, or auditing React components that bridge observables into render —
  especially `useState` + `useEffect` + `.subscribe()` pairs, or existing `useObservable`,
  `useSyncObservable`, `useObservablePromise`, and `useObservableSubject` call sites. Trigger when you
  see a component subscribing to an `Observable` in an effect and copying values into state, or when
  choosing between the react-rx read hooks. For composing the observables themselves (operators,
  flattening, error handling, sharing), use the `rxjs-like-a-pro` skill.
---

# Reading observables from React with react-rx

This skill is about one narrow decision: a React component has an RxJS observable and needs its
latest value (or its "still loading" state) on screen. react-rx gives you hooks that own the
subscription so you don't hand-roll it with `useEffect`. Pick the right hook, keep the observable
stable, and preserve the behavior the old code had.

**This is not a migration mandate.** Plenty of `.subscribe()` calls are correct as they are — writes,
event listeners, side effects, non-RxJS pub/sub. The goal is to replace imperative bridges that only
copy stream values into state, not to erase every subscription. When in doubt, leave working code
alone and explain why.

The guidance here describes react-rx v5 and later (v5 bakes deferral into `useObservable`; v5.1 adds
`useObservablePromise`). Check the installed version before changing old call sites — v4's
`useObservable` was synchronous and is now `useSyncObservable`. Verify against
`packages/react-rx/src` and its `__tests__` if a detail matters.

## The audit workflow

When you're asked to review or clean up observable usage in React code:

1. **Find the candidates.** Look for components that import an `Observable` (or a store/factory that
   returns one) and pair `useState` with a `useEffect` that calls `.subscribe()` and `setState` in
   the `next` callback. That specific shape — subscribe, copy value to state, unsubscribe on cleanup —
   is the one react-rx replaces cleanly.
2. **Classify each one** using the decision below. Most fall into "plain read," some into
   "loading/error state," a few into "leave it alone."
3. **Refactor the clean ones** with the matching recipe, one small change at a time.
4. **Write down the exceptions.** For every subscription you deliberately keep, say why in a comment
   or the PR description. The exceptions are as important as the changes — a reviewer needs to see
   you considered them.
5. **Run the behavior-preservation checklist** (below) against each change before calling it done.

## Decision: does this belong in a react-rx hook at all?

A react-rx hook is for a **React read** — the component renders a value that a stream produces. It is
not a general replacement for every subscription lifecycle. Ask:

- **Does the effect only copy stream values into state for rendering?** → Yes: use a read hook.
- **Does the subscription perform side effects** — dispatch mutations, write to storage, send
  analytics, drive an imperative API, coordinate an `AbortController`? → Keep it an effect (or move
  the effect into the pipeline with `tap`; see `rxjs-like-a-pro`). These are covered under
  [Exceptions](#exceptions-keep-the-subscription) below.
- **Is there no stream at all** — just local component state? → Use plain `useState`. Do not invent a
  `Subject` to replace a `useState`.
- **Must the work outlive the component** (finish after unmount)? → Give it an owner outside the
  component; a hook's subscription ends when the component does.

## Choosing the hook

| The UI needs…                                                                       | Hook                                    |
| ----------------------------------------------------------------------------------- | --------------------------------------- |
| The stream's latest value, with an explicit initial value                           | `useObservable(obs$, initialValue)`     |
| A value that drives a **controlled input** or must stay consistent within one event | `useSyncObservable(obs$, initialValue)` |
| A **Suspense fallback** until the first value, no initial value to show             | `useObservablePromise(obs$)` + `use()`  |
| To turn component **events** into a stream                                          | `useObservableSubject<T>()`             |

### `useObservable` vs `useSyncObservable`

`useObservable` defers store updates through `useDeferredValue`: under load, React can keep showing
the previous value while a background render catches up, and children that suspend keep their
already-revealed content instead of flashing the nearest Suspense fallback. This is the right default
for chrome — presence, previews, permissions, badges, anything that is display, not an input value.

`useSyncObservable` updates synchronously (this is v4's old `useObservable` behavior). Reach for it
exactly when the value **feeds a controlled input**, **gates a write**, or **must stay consistent
within a single event** — places where a deferred, momentarily-stale value would be wrong rather than
just late. Examples from real migrations: a controlled `<input value={...}>`, a validation-status read
that enables a publish button, an auth/workspace identity that a submit handler reads, a `readOnly`
gate on an editor. Its caveat (from the React docs): suspending on a value it returns replaces
visible content with the Suspense fallback, because its updates can't be marked as transitions.

Default to `useObservable`; switch a specific site to `useSyncObservable` only when you can name the
input, write, or event that needs the synchronous value. Making the choice explicit per call site —
and writing a one-line comment for each `useSyncObservable` — keeps the sync-vs-deferred intent
legible.

Both require an **`initialValue`**: it is what renders until the observable emits (and what the
server renders). Every value is valid, `undefined` included — pass it explicitly; omitting it throws
during render. A function argument is a **lazy initializer**, exactly like `useState` (`() => value`);
wrap a function value you actually want as the initial value in an initializer. The initial value is
resolved once per hook instance and is **not** reset when an argument changes.

Neither hook subscribes **during render** — the first render (and every identity change) shows the
initial value, and the live subscription starts on **commit**. Even a synchronous source needs that
commit before it can replace the initial value, unless a shared cache entry is already live and has a
value.

Both accept `{disabled: true}` to pause this hook's subscription (no fetching on its behalf, last
value or initial value returned). `disabled` only affects this hook, not other consumers of the same
shared observable.

### `useObservablePromise` — Suspense instead of a loading flag

When the "loading" UI maps 1:1 to a Suspense fallback and there's no meaningful initial value to
show, `useObservablePromise` turns an observable into a `use()`-compatible promise: suspend until the
first emission, then update in place on later emissions without re-triggering the fallback. A
synchronous source never flashes the fallback at all.

The boundary placement is load-bearing (see [pitfalls](#ssr-activity-and-suspense-pitfalls)): call the
hook in a **parent**, pass the promise to a **child** that calls `use(promise)`, with `<Suspense>`
**between** them. Never call `use()` on the promise in the same component that produced it.

### `useObservableSubject` — events into a stream

`useObservableSubject<T>()` returns `[events$, handleEvent]`, both stable for the component instance.
The underlying `Subject` does not replay, so values pushed with no subscriber are dropped. Extract the
data you need from a DOM event **immediately**, before any async operators — never store the event
object and read it later.

> `useObservableEvent` was removed; do not generate calls to it. There is no `useObservablePromise`
> "initial value" argument, and the value hooks have no built-in `loading` flag — model loading as a
> value (see recipes).

## Keep the observable identity stable

These hooks share work and dedupe by the **observable reference**, not by URL or pipeline contents.
An observable rebuilt on every render is re-subscribed on every render — and if it synchronously
replays a value different from the initial value, that is a render loop. So:

- **Depends on props/state?** Wrap construction in `useMemo` keyed on those inputs.
- **Shared across components intentionally?** Build it at **module scope**.
- **Component-owned subject?** Create it once with a lazy `useState` initializer.
- **An argument that callers pass fresh each render** (e.g. `initialValue: []`)? Stabilize it by value
  before it feeds the `useMemo` — otherwise the observable is rebuilt forever and never settles. See
  the [stabilize-by-value recipe](#recipe-stabilize-an-argument-passed-fresh-each-render).

Do **not** assume React Compiler makes this free. The presence of the compiler dependency does not
prove _this_ component is compiled, and compiler memoization keys on its own inference, not on your
intent to share a subscription. Only skip the explicit `useMemo`/module scope when you have verified
the component is actually compiled (it appears in the compiler's output / is not bailed out) and the
memoization covers the observable construction. When unsure, keep the explicit `useMemo` — it is
correct whether or not the compiler runs.

Keep the underlying work lazy too: `from(fetch(url))` starts the request while the observable is being
constructed, and unsubscribing from a plain promise does not cancel it. Prefer `fromFetch` (cancels
on unsubscribe) or `defer(() => promiseApi())` for a cold, per-subscription request. See
[cancellation](#recipe-cancellation-of-a-cold-request).

## Recipes

Each recipe is a before/after you can apply directly. They are distilled from the Sanity Studio and
plugins migrations (see [Provenance](#provenance)).

### Recipe: a live read

The most common case — an effect that just mirrors a stream into state.

```tsx
// Before
const [doc, setDoc] = useState<Document | null>(null)
useEffect(() => {
  const subscription = doc$.subscribe((next) => setDoc(next))
  return () => subscription.unsubscribe()
}, [doc$])

// After
const doc = useObservable(doc$, null)
```

If the value drives a controlled input, use `useSyncObservable(doc$, null)` instead.

### Recipe: derive a loading / error union

Don't set several pieces of state from inside `subscribe`. Emit one small result object and let the
stream carry loading and error as values. (If errors should bubble to an error boundary instead of
becoming values, you don't need `catchError` — `useObservable` already rethrows stream errors from its
snapshot. Only model errors as values when the UI degrades in place.)

```tsx
// Before
const [data, setData] = useState<T | null>(null)
const [hasError, setHasError] = useState(false)
useEffect(() => {
  const sub = source$.subscribe({
    next: (value) => {
      setData(value)
      setHasError(false)
    },
    error: () => {
      setData(null)
      setHasError(true)
    },
  })
  return () => sub.unsubscribe()
}, [source$])

// After
type Result = {data: T | null; hasError: boolean}
const INITIAL: Result = {data: null, hasError: false}

const result$ = useMemo(
  () =>
    source$.pipe(
      map((value): Result => ({data: value, hasError: false})),
      catchError(() => of({data: null, hasError: true})),
    ),
  [source$],
)
const {data, hasError} = useObservable(result$, INITIAL)
```

For a three-state machine (`loading` | `error` | `success`), emit a discriminated union and
`startWith` the loading case:

```tsx
type State = {status: 'loading'} | {status: 'error'; error: Error} | {status: 'success'; data: T}

const state$ = useMemo(
  () =>
    request$.pipe(
      map((data): State => ({status: 'success', data})),
      startWith({status: 'loading' as const}),
      catchError((error: Error) => of({status: 'error' as const, error})),
    ),
  [request$],
)
const state = useObservable(state$, {status: 'loading'})
```

### Recipe: preserve last-good data while refetching

When an argument changes and you want the previous result to stay visible until the new one arrives,
model that in the stream — a value hook does **not** carry the old observable's value onto a new one.
Drive the request from a stable params stream so a param change refetches without clearing the view:

```tsx
// params$ is a BehaviorSubject<Params> created once (useState initializer / module scope)
const data$ = useMemo(
  () =>
    params$.pipe(
      switchMap((params) => fetchData(params)), // previous value stays until the next emits
    ),
  [params$],
)
const data = useObservable(data$, initialData)
// Update params with params$.next(nextParams) instead of swapping the observable identity.
```

`switchMap` cancels the in-flight previous request when params change (right for "only the latest
matters"). If instead you need every result, choose `concatMap`/`mergeMap`/`exhaustMap` per
`rxjs-like-a-pro`. For an explicit "keep showing previous list across a filter change," the deferred
`useObservable` already keeps the prior frame visible while the new one loads.

### Recipe: refresh / retry a cold request

Turn a retry button into a value pushed through a `BehaviorSubject`, so each trigger re-runs the cold
request inside `switchMap`:

```tsx
const [retry$] = useState(() => new BehaviorSubject(0))

const state$ = useMemo(
  () =>
    retry$.pipe(
      switchMap(() =>
        request$.pipe(
          map((data) => ({status: 'success' as const, data})),
          startWith({status: 'loading' as const}),
          catchError((error: Error) => of({status: 'error' as const, error})),
        ),
      ),
    ),
  [retry$],
)
const state = useObservable(state$, {status: 'loading'})

const handleRetry = useCallback(() => retry$.next(retry$.getValue() + 1), [retry$])
```

### Recipe: cancellation of a cold request

Keep the request cold and cancellable so unsubscribing (unmount, `switchMap` switch) actually stops
it. Build it lazily inside the pipeline, not eagerly during render:

```tsx
// ❌ starts the request during render; unsubscribing can't cancel a bare promise
const observable = useMemo(() => from(fetch(url)), [url])

// ✅ cancels on unsubscribe
const observable = useMemo(() => fromFetch(url), [url])
// or, for a promise-returning API that supports an AbortSignal:
const observable = useMemo(() => defer(() => apiCall(params)), [params])
```

If the request comes from an eager, non-cancellable promise API (one that fires the moment you call
it), building it in render can launch requests from concurrent renders that React then discards —
that is a reason to **keep** an `AbortController`-coordinated effect rather than move to a hook. See
[Exceptions](#exceptions-keep-the-subscription).

### Recipe: seed the initial value to avoid a first-paint flash

When the correct first value is readable synchronously, pass it as the initial value (or `startWith`
it) so there's no flash of the fallback:

```tsx
const visible$ = useMemo(() => {
  const seed = 'checkVisibility' in element ? element.checkVisibility() : false
  return intersection$.pipe(/* … */, startWith(seed))
}, [element])
const visible = useObservable(visible$, false)
```

### Recipe: event subjects and DOM extraction

Push extracted event data — never the event object — into the subject, and read the stream back for
rendering:

```tsx
const [text$, setText] = useObservableSubject<string>()
const text = useSyncObservable(text$, '') // controlled input → sync

return <input value={text} onChange={(event) => setText(event.currentTarget.value)} />
```

Pull `event.currentTarget.value` out **before** any async operator; React reuses synthetic events and
the data would be gone by the time an async operator reads it. Use a `BehaviorSubject` (shared at
module scope only when sharing is intended) if a new subscriber needs the current value.

### Recipe: Suspense loading via `useObservablePromise`

Replace hand-rolled loading placeholders (`startWith({loading: true})`, `isLoading` flags, null
sentinels) with a Suspense boundary when the mapping is 1:1. Split into a parent that owns the promise
and a child that reads it:

```tsx
function AssetView<Asset>(props: {
  promise: ObservablePromise<Asset>
  children: (a: Asset) => ReactNode
}) {
  const asset = use(props.promise)
  return <>{props.children(asset)}</>
}

function WithAsset<Asset>({documentId, observeAsset, children, fallback}: Props<Asset>) {
  // Keyed to documentId, so a reference change never shows the previous document's asset.
  const observable = useMemo(
    () => (documentId ? observeAsset(documentId) : NEVER),
    [documentId, observeAsset],
  )
  const promise = useObservablePromise(observable, {disabled: !documentId})
  if (!documentId) return <>{fallback}</>
  return (
    <Suspense fallback={fallback}>
      <AssetView promise={promise}>{children}</AssetView>
    </Suspense>
  )
}
```

Notes grounded in the hook's contract: the promise is keyed by observable **identity**, so keep it
`useMemo`-stable; a stream error **rejects** the promise, and completion with no emission rejects with
RxJS `EmptyError`; re-suspension on a later identity change hides (does not unmount) committed
content, so sibling form state survives. Don't add a `startWith` placeholder unless that placeholder
should genuinely resolve Suspense.

### Recipe: stabilize an argument passed fresh each render

If callers routinely pass a new array/object literal (e.g. `initialValue: []`), stabilize it by value
before it reaches the `useMemo`, or the observable rebuilds every render and the UI is stuck loading:

```tsx
const [stableInitialValue, setStableInitialValue] = useState(initialValue)
if (!isEqual(stableInitialValue, initialValue)) {
  setStableInitialValue(initialValue)
}
// Build params/options the same way, then key the observable's useMemo on the stable versions.
```

## Exceptions: keep the subscription

These are the cases real reviews deliberately left on manual `.subscribe()` / `useEffect`. Recognize
them and **don't** convert them:

- **Writes and ordered side effects.** Mutations, patch channels, analytics, cache writes, storage
  writes. A value hook reads; it doesn't own write lifecycles. (Move effects into the pipeline with
  `tap` where that reads better, but keep the subscription.)
- **Event-driven stores.** Stores that dispatch on listen/mutation events (comment stores, task
  stores) rather than emitting a render value.
- **Eager, non-cancellable promise APIs.** If building the request in render would fire requests from
  discarded concurrent renders (e.g. an `errorHandler.attempt`-style eager promise), keep the
  `AbortController`/effect that coordinates cancellation.
- **Pagination / retry / continuous streams with their own state.** Infinite lists, event streams
  with retry and cursor state, image loaders — their loading state isn't a 1:1 Suspense fallback.
- **Factories that rebuild their observable per argument change** when a reducer already guarantees
  previous-value-while-loading and same-reference dedupe across keystrokes. Moving to a hook can drop
  those semantics.
- **Public API return shapes.** Changing a hook's returned shape (e.g. from `{documents, loading}` to
  a plain list) is a breaking change for a published hook — don't, unless you're intentionally
  versioning it.
- **Non-RxJS pub/sub, scroll handlers, global error handlers.** Not observables; react-rx doesn't
  apply.
- **Suspense would unmount list rows.** Rows that render an in-place `isPlaceholder` skeleton should
  stay as skeletons — a Suspense boundary there would unmount the row.

## Behavior-preservation checklist

Before finishing each change, confirm the new code matches the old behavior:

- [ ] **Initial value** matches the old `useState` seed, and is passed explicitly (including
      `undefined`). Function values are wrapped in an initializer.
- [ ] **Loading state** is still represented — as a union value / `startWith`, or as a Suspense
      fallback — wherever the old code showed a spinner or placeholder.
- [ ] **Error handling** is preserved: still surfaced to an error boundary (let it throw) _or_ still
      degraded in place (`catchError` to a value) — whichever the old code did. Auth/permission
      screens must still surface errors through render, not drop them silently.
- [ ] **Previous-value-while-loading** behavior is kept where it existed (model it in the stream; the
      value hook won't carry a value across observable identities on its own).
- [ ] **Controlled inputs / write gates / per-event reads** use `useSyncObservable`, not the deferred
      `useObservable`.
- [ ] **Observable identity is stable** (`useMemo` / module scope / `useState`), and any
      fresh-each-render argument is stabilized by value. Don't rely on React Compiler unless verified.
- [ ] **Cold requests stay cold and cancellable** (`fromFetch` / `defer`), not eager (`from(fetch())`).
- [ ] **Optimistic local writes** (if any) are still merged into the stream so the UI updates before
      the server round-trip.
- [ ] Every subscription you **kept** has a one-line reason.

## Tests to run

Validate against the smallest suite that covers the changed behavior, then widen if needed:

- The component's / hook's own unit tests (React Testing Library + Vitest). Assert: renders the
  initial value before first emission, updates on emission, shows loading/error correctly, and resets
  cleanly when an argument changes.
- For identity/tear-sensitive reads, add a test that changes the keyed argument and asserts the
  previous value never renders under the new identity.
- For `useObservablePromise`, assert: suspends until first emission, no fallback flash for a sync
  source, in-place update on later emissions, and that sibling state survives a re-suspension.
- In this repo, react-rx's own contracts live in `packages/react-rx/src/__tests__` — e.g.
  `useObservable.test.tsx`, `useObservable.activity.test.tsx`, `useObservable.hydration.test.tsx`,
  `useObservable.suspense.test.tsx`, `useObservablePromise.*`, `requiredInitialValue.test.tsx`,
  `strictmode.test.tsx`, `*.test-d.ts` (type-level). Run `pnpm test` (Vitest with `--typecheck`, each
  suite run normally and through the React Compiler) and `pnpm lint`. See the repo's AGENTS.md for the
  exact command behavior.

## SSR, Activity, and Suspense pitfalls

- **Boundary placement for `useObservablePromise` is required.** Mounting renders never subscribe the
  source — the fetch starts when the hook's component **commits**, and a suspended component never
  commits. If the promise is `use()`d in the same component that created it (no boundary between), the
  component suspends on its own pending promise before the commit that would start the fetch — it can
  wait forever. Always: hook in the parent, `use()` in a child, `<Suspense>` between.
- **Swapping to a new observable on an already-live consumer** follows React's canonical refetch
  pattern: change the observable inside `startTransition` (or behind `useDeferredValue`) and the
  previous content stays visible while the new data loads. For exactly this case the promise hook
  starts the new source during the (suspended) render — don't generalize the value hooks'
  "never subscribe during render" rule to this path. A transition abandoned after the swap can start a
  fetch nobody consumes; bound never-settling sources with RxJS `timeout`.
- **`<Activity>` visibility.** Hiding an `<Activity>` tree unmounts its hooks' effects and drops their
  subscriptions; revealing restores them. A hidden tree does **not** fetch. To pre-render hidden
  content _with_ data, call the promise hook in a **visible parent** and pass the promise into the
  hidden tree. A mounted-but-hidden component still pins its cache entry past `ttl`, so the value it
  already rendered isn't dropped.
- **Server rendering.** react-rx never subscribes on the server. Value hooks render the initial value
  (`useSyncObservable` renders the resolved initial value strictly; `useObservable` renders the same
  thing the client's first paint will show), and `useObservablePromise` leaves the child showing the
  Suspense fallback — the fetch starts on the client after hydration/commit. `preloadObservablePromise`
  is a no-op on the server. Use these hooks in **Client Components**; for server-fetched data, fetch
  with the framework's server facilities (or RxJS `firstValueFrom`) and pass a value or promise down.
- **`disabled` and preloading.** `disabled: true` stops only this hook's subscription; the promise hook
  can still resolve from another consumer or from `preloadObservablePromise`. The hook's default `ttl`
  is 500 ms; `preloadObservablePromise`'s is 5,000 ms — these retain settled, unused entries, not
  pending ones, so bound hang risk with `timeout`/cancellation. Preload and hook must receive the
  **same** observable object to share an entry.

## Provenance

The recipes and exception list are distilled from a real upgrade stack (react-rx v4 → v5.1.1) and
verified against this repo's `packages/react-rx/src` and its tests. Read these PRs for the concrete
call sites, review discussion, and the reasoning behind each "kept as-is":

- **sanity-io/sanity #13788** — _replace `useState`/`useEffect` observable subscriptions with
  `useObservable`._ Source of the live-read, loading/error-union, seed-initial-value, and
  optimistic-local-write recipes; lists the event-driven-store, pagination, `AbortController`, and
  eager-promise exceptions, including three migrations reverted after review (`useSavedQueries`,
  `documentValuePermissions`, `useProject`).
- **sanity-io/sanity #13799** — _defer non-controlled `useObservable` subscriptions._ The
  sync-vs-deferred split and the identity-coherent deferral rationale; documents exactly which reads
  stay synchronous (controlled inputs, write gates like `useValidationStatus`, the live pane tree) and
  why, with mutation-verified tests.
- **sanity-io/sanity #13814** — _bump react-rx to v5 and adopt `useSyncObservable`._ Confirms v5's
  built-in identity-coherent deferral replaces the hand-rolled `{observable, value}` snapshot helper,
  and when to use the `useSyncObservable` escape hatch.
- **sanity-io/sanity #13828** — _adopt `useObservablePromise` for data loading states._ Source of the
  parent/child Suspense recipe, promise-identity keying, `EmptyError`/rejection behavior, and the
  "Suspense would unmount list rows" / public-API-shape exceptions.
- **sanity-io/plugins #1820** — _bump react-rx to v5.1.1 and adopt `useObservable` across plugins._
  Source of the `BehaviorSubject` retry recipe (`ProjectUsers`) and the stabilize-argument-by-value
  recipe (`useListeningQuery` recreating its observable on a fresh `initialValue: []`).

For the library's own docs: the [guide](https://react-rx.dev/guide),
[API reference](https://react-rx.dev/reference), and
[full docs with runnable examples](https://react-rx.dev/llms-full.txt).

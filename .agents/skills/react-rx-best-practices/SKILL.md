---
name: react-rx-best-practices
description: >
  Decide when and how to read RxJS observables from React with react-rx v7. Use this skill when
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

The examples here target react-rx **v7**. Three of the contracts the recipes rely on are v7-specific:
`initialValue` is **required** (the value hooks throw when it is omitted), the hooks **never subscribe
during render** (the source starts at commit), and `useObservableSubject` returns
`[events$, handleEvent]`. Older majors differ — v4's `useObservable` was synchronous (now
`useSyncObservable`), and earlier v5 releases let you omit `initialValue`.

**Confirm the version you're actually on before changing old call sites.** In a consuming project,
read the `react-rx` entry in that project's `package.json` and lockfile. When a behavioral detail
matters, the public docs are the portable source of truth — the [guide](https://react-rx.dev/guide)
and [API reference](https://react-rx.dev/reference). (The library's own source and tests under
`packages/react-rx/src` exist only inside the react-rx repository itself, not in a repo that merely
depends on it.)

## The audit workflow

When you're asked to review or clean up observable usage in React code:

1. **Find the candidates.** Look for components that import an `Observable` (or a store/factory that
   returns one) and pair `useState` with a `useEffect` that calls `.subscribe()` and `setState` in
   the `next` callback. That specific shape — subscribe, copy value to state, unsubscribe on cleanup —
   is the one react-rx replaces cleanly.
2. **Classify each one** using the decision below. Most fall into "plain read," some into
   "loading/error state," a few into "leave it alone."
3. **Refactor the clean ones** with the matching recipe, one small change at a time.
4. **Note the exceptions.** Where you deliberately keep a subscription and the reason isn't obvious,
   say why — in the PR or a short comment. The exceptions are as important as the changes; a reviewer
   needs to see you considered them.
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
for display values — presence, previews, permissions, badges — anything shown rather than typed into.

`useSyncObservable` updates synchronously (this is v4's old `useObservable` behavior). Reach for it
exactly when the value **feeds a controlled input**, **gates a write**, or **must stay consistent
within a single event** — places where a deferred, momentarily-stale value would be wrong rather than
just late. Examples from real migrations: a controlled `<input value={...}>`, a validation-status read
that enables a publish button, an auth/workspace identity that a submit handler reads, a `readOnly`
gate on an editor. Its caveat (from the React docs): suspending on a value it returns replaces
visible content with the Suspense fallback, because its updates can't be marked as transitions.

Default to `useObservable`; switch a specific site to `useSyncObservable` only when you can name the
input, write, or event that needs the synchronous value. Where that choice isn't self-evident,
record the reason — in the PR or a short comment — but there's no need to annotate every call site.

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
first emission, then update in place on later emissions without re-triggering the fallback.

A **cold mount shows the fallback once even for a synchronous source** — rendering never subscribes,
so the source starts only at commit and the first render pass is still pending. What skips the
fallback is a warm entry: `preloadObservablePromise` before the mount, or a settled entry reused
within `ttl` on a remount. (This differs from earlier v5 behavior; the v7 contract is verified by the
`sync sources fetch at commit` test.)

The boundary must sit **between** the hook and the reader (see
[pitfalls](#ssr-activity-and-suspense-pitfalls)): call the
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
constructed, and unsubscribing from a plain promise does not cancel it. `fromFetch` fixes both — it is
lazy and **aborts the request on unsubscribe**. `defer(() => promiseApi())` only makes the work lazy
(it re-runs per subscription instead of firing at construction); it does **not** abort an
already-started promise. See [the cancellation recipe](#recipe-cancellation-of-a-cold-request) for how
to make a promise API genuinely cancellable.

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

`switchMap` unsubscribes from the previous request when params change (right for "only the latest
matters"). The source must support cancellation to stop the underlying work. If every request must
run, choose `concatMap` for ordered work or `mergeMap` for concurrent work. `exhaustMap` instead
ignores new triggers while work is active.

Note what does **not** preserve the previous list on its own: the deferred `useObservable` only holds
the prior frame while the **same** observable defers. It does not carry a value across an observable
identity change, so building a fresh observable per filter (a new `useMemo` keyed on the filter) falls
back to `initialValue` — a blank list — not the previous one. To keep the previous list visible across
a filter change, either keep the observable identity stable and drive filters through the params
`Subject` above (so the hook retains the last emission until the next arrives), or retain the last
value explicitly with `scan` in that stable pipeline. Alternatively, use `useObservablePromise`
with a child Suspense reader and change its observable inside `startTransition`. A transition alone
does not make a value hook wait for an asynchronous result.

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
  [retry$, request$],
)
const state = useObservable(state$, {status: 'loading'})

const handleRetry = useCallback(() => retry$.next(retry$.getValue() + 1), [retry$])
```

### Recipe: cancellation of a cold request

Two separate goals. **Cold/lazy**: don't start the request while constructing the observable, so each
subscription runs its own and discarded concurrent renders don't fire requests. **Cancellable**:
unsubscribing (unmount, `switchMap` switch) actually aborts in-flight work. `defer` buys you the first
but not the second.

```tsx
// ❌ not cold: starts the request at construction; unsubscribing can't cancel a bare promise
const observable = useMemo(() => from(fetch(url)), [url])

// ✅ cold AND cancellable: fromFetch aborts the fetch on unsubscribe
const observable = useMemo(() => fromFetch(url), [url])

// ⚠️ cold but NOT cancellable by itself: defer re-runs per subscription, but the promise it
//    returns keeps running after unsubscribe unless apiCall is itself wired to abort
const observable = useMemo(() => defer(() => apiCall(params)), [params])
```

To make a promise API genuinely cancellable, thread an `AbortSignal` through it and abort on teardown:

```tsx
const observable = useMemo(
  () =>
    new Observable<Result>((subscriber) => {
      const controller = new AbortController()
      apiCall(params, {signal: controller.signal}).then(
        (value) => {
          subscriber.next(value)
          subscriber.complete()
        },
        (error) => subscriber.error(error),
      )
      return () => controller.abort()
    }),
  [params],
)
```

If the request comes from an eager, non-cancellable promise API (one that fires the moment you call
it), building it in render can launch requests from concurrent renders that React then discards —
that is a reason to **keep** an `AbortController`-coordinated effect rather than move to a hook. See
[Exceptions](#exceptions-keep-the-subscription).

### Recipe: seed the initial value to avoid a first-paint flash

When the correct first value is already available, pass it as the hook's initial value:

```tsx
// Both values are supplied by the caller; visibility$ is stable.
const visible = useObservable(visibility$, initialVisibility)
```

`startWith(initialVisibility)` seeds a subscription, not the first render. In v7 the subscription
starts at commit, so passing `false` to the hook still initially renders `false`, regardless of
`startWith`. For SSR, pass the same initial snapshot from server to client rather than measuring the
DOM during hydration. An initial-value argument does not reset an already-mounted hook.

### Recipe: event subjects and DOM extraction

Push extracted event data — never the event object — into the subject, and read the stream back for
rendering:

```tsx
const [text$, setText] = useObservableSubject<string>()
const text = useSyncObservable(text$, '') // controlled input → sync

return <input value={text} onChange={(event) => setText(event.currentTarget.value)} />
```

Pull `event.currentTarget.value` out **before** any async operator; `currentTarget` only identifies the
element while its event handler runs. Modern React does not pool these events, but that does not make
`currentTarget` safe to read later. Use a `BehaviorSubject` (shared at
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
- [ ] **Requests are cold** (`fromFetch` / `defer`, not `from(fetch())`), and **cancellation** is
      wired where it matters — `fromFetch`, or an `AbortSignal` tied to teardown. Plain `defer` and
      bare promises are lazy but do not abort.
- [ ] **Optimistic local writes** (if any) are still merged into the stream so the UI updates before
      the server round-trip.
- [ ] Non-obvious **kept** subscriptions are explained (in the PR, or a short comment where the
      reason isn't self-evident) — you don't need to annotate the obvious ones.

## Tests to run

Validate against the smallest suite that covers the changed behavior, then widen if needed:

- The component's / hook's own unit tests (React Testing Library + Vitest). Assert: renders the
  initial value before first emission, updates on emission, shows loading/error correctly, and resets
  cleanly when an argument changes.
- For identity/tear-sensitive reads, add a test that changes the keyed argument and asserts the
  previous value never renders under the new identity.
- For `useObservablePromise`, assert: suspends until first emission (the fallback commits once, even
  for a synchronous source), no fallback flash when the entry is preloaded/warm, in-place update on
  later emissions, and that sibling state survives a re-suspension.
- Run them with **the consuming project's own commands.** Check that project's `package.json`
  `scripts` and its lockfile for the package manager and test/lint runner (e.g. `test`, `lint`), and
  use those — don't assume `pnpm`, a monorepo layout, or any particular script name. Many react-rx
  projects use Vitest, but confirm rather than assume.
- The react-rx library's own contract tests (`useObservable.*`, `useObservablePromise.*`,
  `requiredInitialValue`, `strictmode`, `*.test-d.ts`, etc.) live under `packages/react-rx/src/__tests__`
  **in the react-rx repository** — read them there (or browse them on GitHub) as the authoritative
  spec. They won't be present in a project that only depends on react-rx; for those, the
  [guide](https://react-rx.dev/guide) and [API reference](https://react-rx.dev/reference) are the
  portable reference.

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
verified against the react-rx repository's `packages/react-rx/src` and its tests. Read these PRs for
the concrete call sites, review discussion, and the reasoning behind each "kept as-is":

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

# Choosing the Right Hook

react-rx ships three reading hooks, one event-stream hook, and a preload helper. The reading hooks
differ in **update timing** and in **what "no value yet" means** — pick by contract, not by habit.

```
Are you turning component event handlers into a stream?
├─ yes → useObservableSubject (then read the derived stream with one of the below)
└─ no
   Is the value driving a controlled input, or read back synchronously in the same event?
   ├─ yes → useSyncObservable
   └─ no
      Is "waiting for the first value" a Suspense fallback (spinner/skeleton owned by <Suspense>)?
      ├─ yes → useObservablePromise + use()
      └─ no  → useObservable   ← the default
```

## useObservable

Returns the latest value; updates are **deferred** (`useDeferredValue` semantics) and
**identity-coherent** (the observable and its value defer as one snapshot, falling back to the live
value the moment the observable's identity changes — a previous document's value can never render
under a new document's id).

**Use when:** lists, previews, validation, timers, presence, sockets — any live read where the UI
should stay responsive under bursts of emissions. Mounts, remounts, and `<Activity>` reveals render
the current snapshot synchronously, so there is no initial-value flash once a value has been
emitted.

**When NOT to use:**

- **Controlled inputs / same-event read-back.** Deferred updates can lag the caret or drop
  keystrokes under load → `useSyncObservable`.
- **One-shot async where "loading" is a Suspense fallback.** Emitting `{status: 'loading'}` values
  duplicates what `<Suspense>` already expresses → `useObservablePromise`.
- **Plain values with no stream involved.** Don't wrap things in `of()`/`Subject` just to use the
  hook → `useState` / props.
- **Freshly-created observables every render.** The cache keys by reference; see
  `referential-stability.md` first.

Notes: stream errors re-throw during render (Error Boundary). `initialValue` is required, and it is
what renders until the observable emits — the observable is never subscribed during render, so even
a synchronous source (`of`, `startWith`, `BehaviorSubject`) only replaces the `initialValue` right
after the commit that subscribes it. `disabled: true` performs no subscriptions at all, which makes
it the way to gate observables with subscribe-time side effects.

## useSyncObservable

Same signature, but updates synchronously via `useSyncExternalStore` (the v4 behavior), and with the
strict SSR contract: the server always renders the resolved `initialValue`, even when a shared cache
entry has already emitted in the same runtime.

**Use when:** the value feeds a controlled `<input>`/`<textarea>` (caret and IME correctness), the
write side must read the value back in the same event (equality checks before writes), or you need
the strict server-markup contract.

**When NOT to use:**

- **As the default for lists/previews/chrome.** Synchronous store updates cannot be marked as
  Transitions; a suspending child replaces already-visible content with the nearest fallback →
  `useObservable`.
- **Fetch-loading UI** → `useObservablePromise`.
- Anywhere you were about to write `useDeferredValue(useSyncObservable(...))` — that's just
  `useObservable`, with better identity semantics.

## useObservablePromise (+ preloadObservablePromise)

Turns an observable into a `use()`-compatible promise: the consumer suspends until the **first**
emission, later emissions update in place **without re-suspending**, and synchronous sources never
flash a fallback. The hook itself does not suspend — the consumer chooses where the `<Suspense>`
boundary lives.

```tsx
function Users({users$}: {users$: Observable<User[]>}) {
  const promise = useObservablePromise(users$)
  return (
    <Suspense fallback={<Skeleton />}>
      <UsersList promise={promise} />
    </Suspense>
  )
}

function UsersList({promise}: {promise: Promise<User[]>}) {
  const users = use(promise)
  return <ul>{users.map(/* ... */)}</ul>
}
```

`preloadObservablePromise(observable$, {ttl})` warms the same cache outside render (hover, route
loaders, `<Activity>` tabs) so the fallback never shows on first visit.

**Use when:** async data whose absence is a Suspense fallback; `<Activity>` pre-rendering;
render-as-you-fetch with hover preloading.

For `<Activity>`, remember that a hidden tree calling the hook is fully paused: no subscription, no
fetch, until it is revealed. To pre-render hidden content _with_ data, own the promise in a visible
component and pass it into the hidden tree, which reads it with `use()`.

**When NOT to use:**

- **Streams with `startWith(placeholder)`.** The placeholder IS the first emission — the promise
  fulfills instantly with it and Suspense never shows. Either drop the `startWith` or use
  `useObservable` with the placeholder as `initialValue`.
- **Live values that should render immediately without any boundary** → `useObservable`.
- **Controlled inputs** → `useSyncObservable`.
- **Unstable observable identity.** A new observable per render is a new pending promise per render
  (fallback loops). The observable must be stable; prefer creating the promise in a parent that
  doesn't itself suspend.
- Errors reject the promise → Error Boundary. Use `catchError` on the inner observable for graceful
  degradation instead.

## useObservableSubject

Creates a `Subject` scoped to the component instance and returns `[events$, handleEvent]`. Only the
observable side is exposed, and the handler is referentially stable (no `useCallback` needed).

Use it whenever a component's own event handlers should feed a stream:

```tsx
// Events push into a Subject you can see…
const [query$, handleQuery] = useObservableSubject<string>()

// …streams derive from it in plain RxJS, visible and testable…
const results$ = useMemo(
  () =>
    query$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap((q) => search(q)),
    ),
  [query$],
)

// …and hooks read the streams.
const results = useObservable(results$, null)
```

**When NOT to use:**

- **State shared across components.** A component-scoped subject dies with the component → put the
  `Subject` in module scope, a store, or context.
- **Late subscribers that need the current value.** A `Subject` only pushes to whoever is already
  subscribed → `BehaviorSubject`.
- **Handlers with no stream behavior.** Nothing to debounce, cancel, or accumulate means a plain
  handler plus `useState` is simpler.

`useObservableEvent` was removed in v7. It fed a hidden internal `Subject` through a pipeline that
self-subscribed for the component's lifetime, which cost legibility: the subscription was invisible,
values disappeared into `tap` side effects, and the flow couldn't be composed with anything else.
Translate those call sites to the shape above.

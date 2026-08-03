# Choosing the Right Hook

react-rx ships three reading hooks plus a preload helper. They differ in **update timing** and in
**what "no value yet" means** — pick by contract, not by habit.

```
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
should stay responsive under bursts of emissions. Mounts and `<Activity>` reveals still render the
current snapshot synchronously, so there is no initial-value flash.

**When NOT to use:**

- **Controlled inputs / same-event read-back.** Deferred updates can lag the caret or drop
  keystrokes under load → `useSyncObservable`.
- **One-shot async where "loading" is a Suspense fallback.** Emitting `{status: 'loading'}` values
  duplicates what `<Suspense>` already expresses → `useObservablePromise`.
- **Plain values with no stream involved.** Don't wrap things in `of()`/`Subject` just to use the
  hook → `useState` / props.
- **Freshly-created observables every render.** The cache keys by reference; see
  `referential-stability.md` first.

Notes: stream errors re-throw during render (Error Boundary). `initialValue` is used only until the
first emission; a synchronous emission wins on the very first render. The `disabled` option pauses
the live subscription but a render-phase warm-up subscribe still happens — to guarantee zero
subscriptions, swap the observable (e.g. `of(null)`) instead of passing `disabled`.

## useSyncObservable

Same signature, but updates synchronously via `useSyncExternalStore` (the v4 behavior), and with the
strict SSR contract: the server renders the `initialValue` and throws without one.

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

**Use when:** async data whose absence is a Suspense fallback; `<Activity>` pre-rendering (hidden
trees start the fetch during render, no effects needed); render-as-you-fetch with hover preloading.

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

## useObservableEvent — prefer an explicit Subject

`useObservableEvent(handleEvent)` returns a stable callback whose invocations feed a hidden internal
`Subject`, piped through `handleEvent` and self-subscribed for the component's lifetime. The cost is
legibility: the subscription is invisible, values disappear into `tap` side effects, and the flow
can't be composed with anything else.

The explicit version is one line longer and fully transparent:

```tsx
// Events push into a Subject you can see…
const query$ = new Subject<string>()
const handleChange = (e: ChangeEvent<HTMLInputElement>) => query$.next(e.currentTarget.value)

// …streams derive from it in plain RxJS, visible and testable…
const results$ = query$.pipe(
  debounceTime(300),
  distinctUntilChanged(),
  switchMap((q) => search(q)),
)

// …and hooks read the streams.
const results = useObservable(results$)
```

For per-component (non-module) state, create the subject with
`useState(() => new Subject<string>())`.

**Keep `useObservableEvent` only when** a pipeline is genuinely event-first, per-component, and
side-effect-only — and even then, prefer the explicit form in new code. Do not reach for it by
default.

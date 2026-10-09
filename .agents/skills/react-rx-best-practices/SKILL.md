---
name: react-rx-best-practices
description: >
  Best practices for consuming RxJS observables from React components with react-rx. Use this skill
  whenever the user is writing, reviewing, or refactoring React components that touch observables —
  any file that imports from 'react-rx', subscribes to an observable inside `useEffect`, mirrors
  stream values into `useState`, or needs to pick between `useObservable`, `useSyncObservable` and
  `useObservablePromise`. Trigger on patterns like `.subscribe(` inside components, `Subscription`
  refs, `useObservable`, `useSyncObservable`, `useObservablePromise`, `useObservableSubject`,
  `useObservableEvent`, or questions about bridging RxJS state, live data, streaming values, or
  Suspense-based data fetching into React.
---

# react-rx Best Practices

This skill is about the boundary between RxJS and React: how observables become React state without
leaks, tearing, or re-implemented lifecycle code. The core philosophy: **components read streams;
they don't manage subscriptions**. Compose behavior inside the observable (see the `rxjs-like-a-pro`
skill for that side), then hand the finished stream to the right react-rx hook. Whenever a component
calls `.subscribe()`, ask why a hook doesn't own that lifecycle instead.

This is a best-practices skill, not a version-upgrade guide. For upgrading react-rx itself, point
users to https://react-rx.dev/migrate/v6-to-v7 (or https://react-rx.dev/migrate/v4-to-v7 from v4)
instead. Current API docs for every hook are available as a single markdown file at
https://react-rx.dev/llms-full.txt.

## Reference files

- `references/hook-selection.md` — Decision guide for `useObservable` vs `useSyncObservable` vs
  `useObservablePromise`, with explicit "when NOT to use" lists per hook, plus `useObservableSubject`
  for event streams. Read when picking a hook or reviewing hook usage.
- `references/stream-state-recipes.md` — Before/after recipes for the recurring shapes: hand-rolled
  subscription bridges, multi-`setState` subscribe callbacks, retry buttons, Suspense-shaped loading
  states, and redundant deferral wrappers. Read when refactoring existing code onto react-rx hooks.
- `references/referential-stability.md` — Why observable identity matters (react-rx caches by
  reference), how to keep observables stable (module scope, `useState`, `useMemo`, React Compiler),
  and how to stabilize object params and initial values. Read whenever an observable is created
  inside a component, or when debugging resubscribe loops / stuck loading states.
- `references/when-subscribe-is-right.md` — The cases where a manual subscription (or the existing
  code) is the correct design and should be left alone. Read before refactoring anything that isn't
  a plain value stream.

## The #1 anti-pattern: hand-rolled subscription bridges

The most common mistake is re-implementing what `useObservable` already owns — subscription
lifecycle, initial value, teardown, and synchronous first emissions — with `useState` + `useEffect`:

```tsx
// ❌ Bad: manual bridge — leak-prone, stale-closure-prone, no SSR value
function Tutorials() {
  const [items, setItems] = useState<FeedItem[]>([])
  useEffect(() => {
    const subscription = getFeed().subscribe((response) => {
      setItems(response.items)
    })
    return () => subscription.unsubscribe()
  }, [])
  return <Feed items={items} />
}

// ✅ Good: the hook owns the lifecycle; the stream owns the shape of the data
function Tutorials() {
  const items$ = useMemo(() => getFeed().pipe(map((response) => response.items)), [])
  const items = useObservable(items$, EMPTY_ITEMS)
  return <Feed items={items} />
}

const EMPTY_ITEMS: FeedItem[] = []
```

Why this matters beyond fewer lines: `useObservable` renders the required `initialValue` on the
server and on the first client paint (so SSR markup matches), subscribes on commit rather than
during render (so subscribe-time side effects stay out of the render phase), tears down on unmount
and `<Activity>` hide, keeps a warm snapshot across remounts and reveals, and defers its updates so
heavy re-renders don't block urgent input. The manual version gets none of that, and every copy of
it is another chance for a missing `unsubscribe` or a stale-closure bug.

## Choosing the right hook

| You are rendering                                          | Hook                   |
| ---------------------------------------------------------- | ---------------------- |
| Live values: lists, previews, timers, sockets, chrome      | `useObservable`        |
| A controlled input, or a value read back in the same event | `useSyncObservable`    |
| Async data where "loading" means a Suspense fallback       | `useObservablePromise` |
| Component-scoped events that feed a stream                 | `useObservableSubject` |

Default to `useObservable`. Its updates are deferred (`useDeferredValue` semantics) and
identity-coherent, so streams can be chatty without making the UI feel blocked, and suspending
children never flash a fallback over already-visible content. Reach for the others only for their
specific contracts. Each hook has failure modes when misused — read
`references/hook-selection.md` for the per-hook "when NOT to use" lists before deciding.

`initialValue` is **required** for `useObservable` and `useSyncObservable`. It is what renders until
the observable emits, on the server included, and omitting it throws during render. Every value is
valid, `undefined` included, but it has to be passed explicitly. Functions are `useState`-style
initializers, resolved once per hook instance. A stream with no meaningful initial value is a signal
to reach for `useObservablePromise` and let `<Suspense>` own the waiting state instead of inventing
a placeholder.

## Keep observables referentially stable

react-rx caches subscriptions and snapshots in a `WeakMap` keyed by the observable's **reference
identity**. An observable recreated on every render means resubscribing on every render: lost state,
refetch loops, and permanently-loading UIs. Ensure one of these is true:

1. The observable lives in **module scope** (or comes from a store/context that owns it).
2. It's created once per component with **`useState(() => ...)`** (subjects, per-instance streams).
3. It's memoized with **`useMemo(() => ..., [deps])`** and every dep is itself stable.
4. The project has the **React Compiler** enabled, which auto-memoizes the construction.

Object params and `initialValue` arguments follow the same rule — a fresh `[]` or `{}` per render
can silently defeat a `useMemo`. Details, compiler-detection steps, and value-stabilization patterns
are in `references/referential-stability.md`.

## Derive state in the stream, not in callbacks

When a subscribe callback sets multiple pieces of state (`setData`, `setLoading`, `setError`), the
refactor is not three hooks — it's one stream that emits a single state value:

```tsx
const state$ = useMemo(
  () =>
    fetchProject(projectId).pipe(
      map((project) => ({status: 'success', project}) as const),
      startWith({status: 'loading'} as const),
      catchError((error) => of({status: 'error', error} as const)),
    ),
  [projectId],
)
const state = useObservable(state$, INITIAL_STATE)
```

One emission per render-relevant change; no torn intermediate states; the reset-on-param-change
behavior is explicit in the pipe (`startWith`) rather than implied by effect ordering.

Error semantics to keep in mind: `useObservable` and `useSyncObservable` **re-throw stream errors
during render**, so an unhandled stream error surfaces at the nearest Error Boundary. Use
`catchError` (as above) only when errors should render as values instead. `useObservablePromise`
rejects the promise, which `use()` also routes to the Error Boundary.

More recipe shapes — retry buttons via `BehaviorSubject`, Suspense-shaped loading, deferral cleanup —
are in `references/stream-state-recipes.md`.

## Events push into a Subject you can see

Event handlers should push a value and stop there. The behavior belongs on streams derived from that
`Subject`, where it is visible, shareable, and testable.

`useObservableSubject` is the component-scoped version: it owns the `Subject`, exposes only its
observable side, and returns a stable handler. Reach for a module-scope (or store-owned) `Subject`
when more than one component reads or writes the same events.

```tsx
// ✅ Component-scoped events: the hook owns the Subject
const [changes$, handleChange] = useObservableSubject<ChangeEvent<HTMLInputElement>>()
const text$ = useMemo(() => changes$.pipe(map((event) => event.currentTarget.value)), [changes$])
const text = useSyncObservable(text$, '')

// ✅ Shared events: a Subject in module scope, handlers just push
const text$ = new Subject<string>()
const handleChange = (event: ChangeEvent<HTMLInputElement>) => text$.next(event.currentTarget.value)
```

Everything downstream (`debounceTime`, `switchMap`, derived state) goes in the `pipe`, not in the
handler. Do not mirror the value into `useState` with `tap(setState)`; the derived stream _is_ the
state.

`useObservableEvent` was removed in react-rx v7. Legacy call sites hid the data flow: the
subscription was invisible, the pipeline ran for side effects only, and readers couldn't tell where
values went. When you find one, translate the pipeline body onto a `Subject` plus derived streams as
above (see https://react-rx.dev/migrate/v6-to-v7#useobservableevent-is-removed).

## When the existing code is already right

Not every `.subscribe()` in a component is a defect. Event-driven stores, side-effect-only
subscriptions, AbortController-coordinated fetches, eager promise-producing APIs, and reducers with
previous-value semantics all have good reasons to stay as they are — and "the rewrite isn't clearer"
is itself a valid reason to stop. Read `references/when-subscribe-is-right.md` before refactoring
anything that isn't a plain value bridge.

## Spotting opportunities in existing code

When reviewing a codebase (not as a project-wide crusade — as part of touching code you're already
working on), these searches surface candidates:

- `.subscribe(` inside a `useEffect` body — likely a hand-rolled bridge
- `Subscription` values stored in refs or arrays inside components
- `useDeferredValue(useObservable(` — redundant on react-rx ≥ 5.1 (deferral is built in)
- `startWith({loading` / `isLoading` state mirrored from a stream — candidate for a union stream or
  `useObservablePromise`
- `firstValueFrom(` inside effects — often a stream forced into a promise for no reason
- `useObservableEvent(` — removed in v7; translate to a `Subject` plus derived streams

Judge each hit against `references/when-subscribe-is-right.md` before changing it, and after any
change verify: observable identity is stable, loading/reset behavior on param change matches the
old code, and errors still reach the same place (boundary vs rendered value).

## Version note

Check the installed version before applying the hook-specific advice:

- **v7** (React 19.2+) is what this skill assumes: `initialValue` is required, observables are never
  subscribed during render, `useObservableSubject` handles events, and `useObservableEvent` is gone.
- **v5 / v6** have the same deferred, identity-coherent `useObservable`, but `initialValue` is
  optional (deprecated in v6) and `useObservableEvent` still exists.
- **v4** has only a synchronous `useObservable`. The bridge and stream-shape recipes still apply.
  Skip the deferral advice and suggest the upgrade guide at https://react-rx.dev/migrate/v4-to-v7
  first.

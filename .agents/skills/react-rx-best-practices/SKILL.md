---
name: react-rx-best-practices
description: >
  Best practices for consuming RxJS observables from React components with react-rx. Use this skill
  whenever the user is writing, reviewing, or refactoring React components that touch observables —
  any file that imports from 'react-rx', subscribes to an observable inside `useEffect`, mirrors
  stream values into `useState`, or needs to pick between `useObservable`, `useSyncObservable` and
  `useObservablePromise`. Trigger on patterns like `.subscribe(` inside components, `Subscription`
  refs, `useObservable`, `useSyncObservable`, `useObservablePromise`, `useObservableEvent`, or
  questions about bridging RxJS state, live data, streaming values, or Suspense-based data fetching
  into React.
---

# react-rx Best Practices

This skill is about the boundary between RxJS and React: how observables become React state without
leaks, tearing, or re-implemented lifecycle code. The core philosophy: **components read streams;
they don't manage subscriptions**. Compose behavior inside the observable (see the `rxjs-like-a-pro`
skill for that side), then hand the finished stream to the right react-rx hook. Whenever a component
calls `.subscribe()`, ask why a hook doesn't own that lifecycle instead.

This is a best-practices skill, not a version-upgrade guide. For upgrading react-rx v4 → v5, point
users to https://react-rx.dev/migrate/v4-to-v5 instead. Current API docs for every hook are available
as a single markdown file at https://react-rx.dev/llms-full.txt.

## Reference files

- `references/hook-selection.md` — Decision guide for `useObservable` vs `useSyncObservable` vs
  `useObservablePromise`, with explicit "when NOT to use" lists per hook, and why to prefer explicit
  `Subject`s over `useObservableEvent`. Read when picking a hook or reviewing hook usage.
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
// ❌ Bad: manual bridge — leak-prone, misses sync emissions, re-renders on mount
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

Why this matters beyond fewer lines: `useObservable` reads synchronous emissions during the first
render (no mount-tax re-render), tears down on unmount and `<Activity>` hide, keeps a warm snapshot
across remounts, works during SSR, and its updates are deferred so heavy re-renders don't block
urgent input. The manual version gets none of that, and every copy of it is another chance for a
missing `unsubscribe` or a stale-closure bug.

## Choosing the right hook

| You are rendering                                        | Hook                   |
| -------------------------------------------------------- | ---------------------- |
| Live values: lists, previews, timers, sockets, chrome     | `useObservable`        |
| A controlled input, or a value read back in the same event | `useSyncObservable`    |
| Async data where "loading" means a Suspense fallback      | `useObservablePromise` |

Default to `useObservable`. Its updates are deferred (`useDeferredValue` semantics) and
identity-coherent, so streams can be chatty without making the UI feel blocked, and suspending
children never flash a fallback over already-visible content. Reach for the other two only for their
specific contracts. Each hook has failure modes when misused — read
`references/hook-selection.md` for the per-hook "when NOT to use" lists before deciding.

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

## Prefer explicit Subjects over `useObservableEvent`

`useObservableEvent` wires an event callback into a self-subscribed pipeline. In practice it hides
the data flow: the subscription is invisible, the pipeline runs for side effects only, and readers
can't tell where values go. The same wiring is clearer with a `Subject` you can see:

```tsx
// 🤔 Harder to follow: where do these values go? what subscribes to this?
const handleChange = useObservableEvent((events$: Observable<ChangeEvent<HTMLInputElement>>) =>
  events$.pipe(
    map((e) => e.currentTarget.value),
    tap((value) => text$.next(value)),
  ),
)

// ✅ Clear: events push into a Subject; streams derive from it; hooks read the streams
const text$ = new Subject<string>()
const handleChange = (e: ChangeEvent<HTMLInputElement>) => text$.next(e.currentTarget.value)
```

Everything downstream (`debounceTime`, `switchMap`, derived state) belongs on the streams composed
from `text$` — where it is visible, shareable, and testable. Reserve `useObservableEvent` for the
rare pipeline that is genuinely event-first, per-component, and side-effect-only; do not introduce
it into new code as a default.

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

Judge each hit against `references/when-subscribe-is-right.md` before changing it, and after any
change verify: observable identity is stable, loading/reset behavior on param change matches the
old code, and errors still reach the same place (boundary vs rendered value).

## Version note

Deferred updates, identity-coherent snapshots, `useSyncObservable`, and `useObservablePromise` are
react-rx v5 APIs (React 19.2+). On react-rx v4, `useObservable` updates synchronously — the bridge
and stream-shape recipes still apply, but skip the deferral advice and suggest the upgrade guide at
https://react-rx.dev/migrate/v4-to-v5 first.

# Getting Started

## Installation

```sh npm2yarn
npm i react-rx rxjs
```

## The mental model

react-rx keeps a strict division of labor:

- **Streams own behavior.** Fetching, retrying, debouncing, accumulating, combining. All composed in RxJS, outside of render or in a `useMemo`.
- **Hooks own lifecycle.** A hook subscribes, reads synchronous emissions during the first render, tears down on unmount, and re-renders when the stream emits. You never call `.subscribe()` in a component.
- **Events push into Subjects.** A plain event handler calls `subject.next(value)`. Streams derive from the subject.

```tsx
// Events push into a Subject…
const [query$] = useState(() => new Subject<string>())
// …behavior lives on derived streams…
const results$ = useMemo(() => query$.pipe(debounceTime(300), switchMap(search)), [query$])
// …and hooks read the streams.
const query = useSyncObservable(query$, '') // controlled input → synchronous
const results = useObservable(results$) // everything else → deferred
```

This page is for copy-paste: signatures, options, and recipes. Prefer to learn by tinkering? Walk the runnable examples instead: [First steps](/examples/simple), then [Basic state](/examples/basic-state), then [Timers & time ago](/examples/timers).

## Which hook should I use?

**Default to `useObservable`.** Store updates are deferred, so lists, previews, and validation stay responsive. It also plays nicely with Suspense.

- Don't use it for controlled inputs. Deferred updates can lag the caret.
- Don't use it for one-shot async where the loading UI is a Suspense fallback. Use `useObservablePromise` for that.

**Reach for `useSyncObservable`** in two cases only:

- The value feeds a controlled input. Sync updates keep the caret and IME intact.
- The value must be read back synchronously in the same event.

It also has the strict v4 SSR contract: the server renders the `initialValue` and throws without one. Don't make it your default. Synchronous store updates cannot be marked as Transitions, so a suspending child replaces visible content with a fallback.

**Reach for `useObservablePromise`** when "waiting for the first value" should render as a `<Suspense>` fallback. Don't use it on streams that `startWith(...)` a placeholder. The placeholder counts as the first emission, so the promise fulfills instantly with it.

Each hook's [API reference](/reference) has a full "When not to use" list. See [Suspense & deferred values](/examples/suspense) for a side-by-side demo. Upgrading? See the [v4 → v5 migration guide](/migrate/v4-to-v5).

## Observable Hooks

### useObservable()

Use observables in React components with the `useObservable` hook.

The hook gives you the current value of the observable. Later emissions update the component at deferred priority: urgent renders keep the previous value until a background render catches up.

Example:

```tsx
import {useMemo} from 'react'
import {useObservable} from 'react-rx'
import {interval} from 'rxjs'

function MyComponent(props) {
  const observable = useMemo(() => interval(100), [])
  const number = useObservable(observable, 0)

  return <>The number is {number}</>
}
```

The `initialValue` argument is optional. Without it, the returned value may be `undefined` at first.

If the observable emits _synchronously_ at subscription time, that emission wins. The `initialValue` is then ignored on the first render. Mounts and `<Activity>` reveals are never deferred.

```tsx
import {useMemo} from 'react'
import {useObservable} from 'react-rx'
import {of} from 'rxjs'

// This component will never render "Hello mars!" since the observable emits "world" synchronously.
function MyComponent(props) {
  const observable = useMemo(() => of('world'), [])
  const planet = useObservable(observable, 'mars')

  return <>Hello {planet}!</>
}
```

`useObservable` and `useSyncObservable` differ in how _updates_ propagate (deferred vs synchronous), not in the first render. On the server, `useObservable` paints what the first client render will show (here `"world"`). `useSyncObservable` would paint the `initialValue` (`"mars"`).

**The `disabled` option** pauses the hook's _active_ subscription. Think of it like `pause: true`:

- While `disabled` is `true`, the hook keeps no live subscription. It returns the last value it received, or the `initialValue` if nothing arrived yet.
- Setting `disabled` back to `false` resumes the live subscription.
- Important: `disabled` does **not** skip the initial warm-up subscription. Both hooks briefly subscribe during render so a synchronous emission can become the current snapshot. Cold observables with subscribe-time side effects (like `fromFetch`) still run that work while disabled.

```tsx
import {useEffect, useState} from 'react'
import {useObservable} from 'react-rx'
import {Subject} from 'rxjs'

// While `disabled` is true, later async emissions are ignored and the last
// received value (here the initialValue "mars") is returned.
function MyComponent(props) {
  const [observable] = useState(() => new Subject<string>())
  const planet = useObservable(observable, 'mars', {disabled: true})

  useEffect(() => {
    observable.next('world')
  }, [observable])

  return <>Hello {planet}!</>
}
```

Want to guarantee _zero_ subscriptions to an observable? Don't use `disabled`. Swap the observable instead, for example to `of(null)` until you are ready to fetch:

```tsx
import {useMemo} from 'react'
import {useObservable} from 'react-rx'
import {of} from 'rxjs'
import {fromFetch} from 'rxjs/fetch'

function Users({shouldFetch}: {shouldFetch: boolean}) {
  // Prefer swapping the observable over `{disabled: !shouldFetch}`:
  // `disabled` still performs the render-phase warm-up subscribe, which would
  // fire the request even when `shouldFetch` is false.
  const users$ = useMemo(
    () =>
      shouldFetch
        ? fromFetch('https://api.github.com/users?per_page=5', {
            selector: (response) => response.json(),
          })
        : of(null),
    [shouldFetch],
  )
  const users = useObservable(users$, null)

  return <pre>{JSON.stringify(users, null, 2)}</pre>
}
```

The fetch observable is only created when `shouldFetch` is true. So it can never be subscribed before then.

### useSyncObservable()

Same signature as `useObservable`, but updates are synchronous (the previous default). Use it for controlled inputs:

```tsx
import {useState} from 'react'
import {useSyncObservable} from 'react-rx'
import {Subject} from 'rxjs'

function SearchField() {
  const [text$] = useState(() => new Subject<string>())
  // Controlled input values must update synchronously.
  const text = useSyncObservable(text$, '')

  return <input value={text} onChange={(e) => text$.next(e.currentTarget.value)} />
}
```

### useObservablePromise()

Use this for **Suspense-powered data fetching**, instead of tracking loading state in the stream.

Why a separate hook? `useObservable` is built on `useSyncExternalStore`. That is great for live values, but it cannot activate a [`Suspense`](https://react.dev/reference/react/Suspense#what-activates-a-suspense-boundary) boundary. And React 19.2 [`Activity`](https://react.dev/reference/react/Activity#pre-rendering-content-thats-likely-to-become-visible) pre-rendering only fetches data read with `use(promise)`.

`useObservablePromise` returns an instrumented Promise you pass to React's `use()`. The hook itself does **not** suspend. The consumer decides where the Suspense boundary lives:

```tsx
import {Suspense, use, useMemo} from 'react'
import {useObservablePromise} from 'react-rx'
import {fromFetch} from 'rxjs/fetch'

function Users() {
  const users$ = useMemo(
    () =>
      fromFetch('https://api.github.com/users?per_page=5', {
        selector: (response) => response.json(),
      }),
    [],
  )
  const promise = useObservablePromise(users$)

  return (
    <Suspense fallback={<p>Loading users…</p>}>
      <UsersList promise={promise} />
    </Suspense>
  )
}

function UsersList({promise}: {promise: Promise<unknown>}) {
  const users = use(promise)
  return <pre>{JSON.stringify(users, null, 2)}</pre>
}
```

Prefer creating the promise in a parent that does **not** suspend (as above). Then Suspense retries always see the same promise identity.

The single-component form also works when the observable identity is stable across retries (module-level cache, or a shared `WeakMap` keyed by request):

```tsx
function UsersList({users$}) {
  // `users$` must be referentially stable for the in-flight request
  const users = use(useObservablePromise(users$))
  return <pre>{JSON.stringify(users, null, 2)}</pre>
}
```

**Semantics**

- Suspends until the observable's **first** emission (`firstValueFrom` semantics).
- Later emissions update the UI **without** re-showing the Suspense fallback.
- Sync sources (`of`, `BehaviorSubject`, replayed `shareReplay`) never flash a fallback.
- Errors reject the promise and surface through the nearest Error Boundary. Prefer `catchError` on the _inner_ observable when you want graceful degradation instead of a boundary.
- Completing without emitting rejects with RxJS `EmptyError`.
- Swapping to a **different** observable returns a new pending promise, so the fallback shows again. Want to keep the previous content visible instead? Change the observable inside [`startTransition`](https://react.dev/reference/react/startTransition), or read the promise through [`useDeferredValue`](https://react.dev/reference/react/useDeferredValue). Both also give you a staleness signal (`isPending`, or `deferredPromise !== promise`) to dim stale content while the new data loads.

**Not for `startWith` placeholders.** The first emission unblocks Suspense. So `startWith('loading')` fulfills immediately with `"loading"`. For placeholder and loading-value patterns, use `useObservable` instead.

**Options**

```ts
useObservablePromise(observable$, {
  disabled?: boolean // default false. When true, this component starts no fetch
  ttl?: number // default 500. Retention (ms) after settle with no subscribers
})
```

`disabled: true` fully prevents fetching on behalf of this component. That is different from `useObservable`'s `disabled`, which still runs a warm-up probe. The returned promise is still the shared cache entry, so a sibling or `preloadObservablePromise` can warm it.

`ttl` controls how long a settled value stays reusable after unmount:

- Remount within the window: the promise is reused. No refetch, no fallback.
- After it expires: the next mount refetches.
- Eviction only affects future consumers. Mounted components keep their value. Hiding an `<Activity>` tree longer than `ttl` never drops what it already rendered.

**Deferring expensive re-renders**

Like every external-store subscription, emission-driven updates render at synchronous priority. React cannot time-slice them directly.

If an emission re-renders something expensive: defer the promise, and memoize the expensive subtree. The synchronous pass then skips the memoized subtree (it still sees the old promise). The subtree re-renders at deferred priority instead: time-sliced, interruptible by urgent updates, and coalesced under rapid emissions.

```tsx
const BigChart = memo(function BigChart({promise}) {
  const data = use(promise)
  return <Chart data={data} />
})

function Dashboard({metrics$}) {
  const promise = useObservablePromise(metrics$)
  const deferredPromise = useDeferredValue(promise)
  return <BigChart promise={deferredPromise} />
}
```

The `memo` is required. Without it, the subtree re-renders during the synchronous pass anyway (with the old promise), and the deferral achieves nothing. See [deferring re-rendering for a part of the UI](https://react.dev/reference/react/useDeferredValue#deferring-re-rendering-for-a-part-of-the-ui).

Swapped promises are always pre-settled, so the deferred subtree never suspends. It just lags by a paint under load. If the stream itself is too chatty, throttle in the pipe (`auditTime`, `throttleTime`).

**Preloading**

Warm the cache outside of render (hover, route loaders) with `preloadObservablePromise`:

```tsx
import {preloadObservablePromise, useObservablePromise} from 'react-rx'

function TabButton({users$, onSelect}) {
  return (
    <button
      type="button"
      onMouseEnter={() => preloadObservablePromise(users$, {ttl: 5_000})}
      onClick={onSelect}
    >
      Users
    </button>
  )
}
```

Calling it starts the source subscription immediately. Pending entries are never timed out. If the observable never emits or completes, the promise stays pending and the subscription stays alive until it settles. When a preload can stall, bound it with RxJS [`timeout`](https://rxjs.dev/api/operators/timeout), or cancel the source.

**Which hook when?**

| Need                                                   | Hook                   |
| ------------------------------------------------------ | ---------------------- |
| Live values, timers, subjects, optional `initialValue` | `useObservable`        |
| Controlled inputs / synchronous store updates          | `useSyncObservable`    |
| Async data + Suspense / Activity pre-render            | `useObservablePromise` |

Want to share a cold observable across subscribers yourself? Keep using RxJS `shareReplay({bufferSize: 1, refCount: true})`. The hook's `ttl` is a lightweight mount/unmount cache, not a full query cache.

## Working with events

Events become streams by pushing into a `Subject` from a plain event handler:

```tsx
import {useMemo, useState} from 'react'
import {useObservable} from 'react-rx'
import {map, scan, Subject} from 'rxjs'

function ClickCounter() {
  const [clicks$] = useState(() => new Subject<void>())
  const count$ = useMemo(() => clicks$.pipe(scan((count) => count + 1, 0)), [clicks$])
  const count = useObservable(count$, 0)

  return <button onClick={() => clicks$.next()}>Clicked {count} times</button>
}
```

The handler is one visible line. Every behavior (throttling, deduping, switching to async work) lives on streams derived from the subject. There it can be composed, shared, and tested.

Use a module-level `Subject` when the stream is shared across components. Use `useState(() => new Subject())` for per-component streams.

There is also a [`useObservableEvent`](/reference#useobservableevent) hook that wires an event callback into a self-subscribed pipeline. We recommend the explicit `Subject` pattern instead. `useObservableEvent` hides the subscription and the data flow inside the hook, which makes components harder to follow as they grow. Reserve it for pipelines that are genuinely event-first, per-component, and side-effect-only.

## Patterns

### Retry and refresh

Model the trigger as a stream, then derive the request from it. A `BehaviorSubject` makes a natural retry counter:

```tsx
import {useMemo, useState} from 'react'
import {useObservable} from 'react-rx'
import {BehaviorSubject, catchError, map, of, startWith, switchMap} from 'rxjs'

type State =
  {status: 'loading'} | {status: 'error'; error: Error} | {status: 'success'; users: User[]}

function ProjectUsers({projectId}: {projectId: string}) {
  const [retry$] = useState(() => new BehaviorSubject(0))

  const state$ = useMemo(
    () =>
      retry$.pipe(
        switchMap(() =>
          fetchProjectUsers(projectId).pipe(
            map((users) => ({status: 'success', users}) as const),
            startWith({status: 'loading'} as const),
            catchError((error: Error) => of({status: 'error', error} as const)),
          ),
        ),
      ),
    [retry$, projectId],
  )
  const state = useObservable(state$, {status: 'loading'})

  if (state.status === 'error') {
    return <button onClick={() => retry$.next(retry$.getValue() + 1)}>Retry</button>
  }
  return state.status === 'loading' ? <Spinner /> : <UserList users={state.users} />
}
```

The same shape covers polling ticks, visibility changes, and form submissions.

### Errors: boundary or value

`useObservable` and `useSyncObservable` re-throw stream errors during render. An unhandled error surfaces at the nearest [Error Boundary](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary), same as a rendering error. See the [error handling example](/examples/errors).

Want errors to render as UI instead (a retry button, a degraded state)? Catch them in the stream with `catchError` and emit a value, as in the retry pattern above.

`useObservablePromise` rejects its promise. `use()` routes that to the Error Boundary the same way.

### Keep observables referentially stable

react-rx caches subscriptions and snapshots by the observable's **reference identity**. An observable recreated on every render resubscribes on every render. Symptoms: refetch loops, timers restarting, `useObservablePromise` stuck on its fallback.

Guarantee stability one of these ways:

1. Module scope, or a store/context that owns the stream.
2. `useState(() => new Subject())` for per-component subjects.
3. `useMemo(() => ..., [deps])` with deps that are themselves stable.
4. The [React Compiler](https://react.dev/learn/react-compiler), which auto-memoizes construction. react-rx's test suite runs through it.

Watch the inputs too. A fresh `[]` or `{}` passed as a param or `initialValue` on every render can silently defeat a `useMemo` one level down. Stabilize object-ish inputs by value before they enter a dependency list.

The same discipline applies to **lazy `initialValue` functions**. Until the stream's first emission, the initializer runs on every snapshot read. So it must return a stable value. A function that builds a fresh object per call (like `() => computeParts(Date.now())`) makes `useSyncExternalStore` see a changed snapshot on every check, and the component loops ("Maximum update depth exceeded"). Memoize the computed value with `useMemo` and pass it as a plain value. Streams that emit synchronously (`startWith`, `BehaviorSubject`) never reach the `initialValue` path at all.

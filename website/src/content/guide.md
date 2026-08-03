# Getting Started

## Installation

```sh npm2yarn
npm i react-rx rxjs
```

## The mental model

react-rx keeps a strict division of labor:

- **Streams own behavior.** Fetching, retrying, debouncing, accumulating, combining — all of it is composed in RxJS, outside of render or in a `useMemo`.
- **Hooks own lifecycle.** A hook subscribes, reads synchronous emissions during the first render, tears down on unmount, and re-renders the component when the stream emits. You never call `.subscribe()` in a component.
- **Events push into Subjects.** A plain event handler calls `subject.next(value)`; streams derive from the subject.

```tsx
import {useMemo, useState} from 'react'
import {useObservable, useSyncObservable} from 'react-rx'
import {debounceTime, distinctUntilChanged, filter, Subject, switchMap} from 'rxjs'

function Search() {
  // One Subject per component instance — events push into it
  const [query$] = useState(() => new Subject<string>())

  // Behavior lives on derived streams
  const results$ = useMemo(
    () =>
      query$.pipe(
        debounceTime(300),
        distinctUntilChanged(),
        filter((query) => query.length > 1),
        switchMap((query) => searchApi(query)),
      ),
    [query$],
  )

  // Hooks read the streams
  const query = useSyncObservable(query$, '') // controlled input → synchronous
  const results = useObservable(results$) // everything else → deferred

  return (
    <>
      <input value={query} onChange={(e) => query$.next(e.currentTarget.value)} />
      <ResultsList results={results} />
    </>
  )
}
```

## Which hook should I use?

- **Default to `useObservable`** — store updates are deferred, so previews, validation, lists, and other chrome stay responsive and play nicely with Suspense. Don't use it for controlled inputs (deferred updates can lag the caret) or for one-shot async where the loading UI is a Suspense fallback.
- **Reach for `useSyncObservable`** only when the value feeds a controlled input (caret/IME breakage or lost keystrokes under load) or must be read back synchronously in the same event. It is also the hook with the strict v4 SSR contract (server renders the `initialValue`, throws without one). Don't make it your default: synchronous store updates cannot be marked as Transitions, so a suspending child replaces visible content with a fallback.
- **Reach for `useObservablePromise`** when "waiting for the first value" should render as a `<Suspense>` fallback. Don't use it on streams that `startWith(...)` a placeholder — the placeholder _is_ the first emission, so the promise fulfills instantly with it.

Each hook's [API reference](/reference) has a full "When not to use" list. See [Suspense & deferred values](/examples/suspense) for a side-by-side demo, and the [v4 → v5 migration guide](/migrate/v4-to-v5) if you are upgrading.

## Observable Hooks

### useObservable()

Use observables in React components with the `useObservable` hook.

If you need to subscribe to an observable in your component, this hook will give you the current value from it. Later emissions update the component at deferred priority — urgent renders keep the previous value until a background render catches up.

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

The `initialValue` argument is optional. If it is omitted, the value returned from `useObservable` may be `undefined` initially. If the observable emits a value _synchronously_ at subscription time, that value will be used as the initial value, and any `initialValue` passed as argument to `useObservable` will be ignored on the first render (mounts and `<Activity>` reveals are not deferred):

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

The difference between `useObservable` and `useSyncObservable` is how _updates_ propagate (deferred vs synchronous), not the first render. On the server, `useObservable` paints what the first client render will show (here `"world"`), while `useSyncObservable` would paint the `initialValue` (`"mars"`).

The `disabled` option pauses the hook's _active_ subscription — think of it like `pause: true`. While `disabled` is `true`, the hook will not keep a live subscription that pushes updates into the component, and it returns the last value it already received (or the `initialValue` if nothing has been received yet). Turning `disabled` back to `false` resumes the live subscription.

Important: `disabled` does **not** skip the hook's initial warm-up subscription. Both hooks always briefly subscribe during render so a synchronous emission can become the current snapshot. That means cold observables with subscribe-time side effects (for example `fromFetch`) still run that work even when `disabled` is `true`.

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

If the goal is to avoid _any_ subscription to a particular observable, do not use `disabled`. Pass a different observable instead — for example swap in `of(null)` until you are ready to fetch:

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

Because the fetch observable is only created (and therefore only ever subscribed) when `shouldFetch` is true, this guarantees zero subscriptions to `fromFetch` until then.

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

Use this when you want **Suspense-powered data fetching** instead of tracking loading state in the stream.

`useObservable` is built on `useSyncExternalStore`. That is great for live values, but it cannot activate a [`Suspense`](https://react.dev/reference/react/Suspense#what-activates-a-suspense-boundary) boundary, and React 19.2 [`Activity`](https://react.dev/reference/react/Activity#pre-rendering-content-thats-likely-to-become-visible) pre-rendering only fetches data read with `use(promise)`.

`useObservablePromise` returns an instrumented Promise you pass to React's `use()`. The hook itself does **not** suspend — the consumer decides where the Suspense boundary lives:

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

Prefer creating the promise in a parent that does **not** suspend (as above), so Suspense retries always see the same promise identity. The single-component form also works when the observable identity is stable across retries (module-level cache, or a shared `WeakMap` keyed by request):

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
- Swapping to a **different** observable returns a new pending promise, so the fallback shows again. To keep the previous content visible instead, change the observable inside [`startTransition`](https://react.dev/reference/react/startTransition) or read the promise through [`useDeferredValue`](https://react.dev/reference/react/useDeferredValue) — both also give you a staleness signal (`isPending`, or `deferredPromise !== promise`) to dim stale content while the new data loads.

**Not for `startWith` placeholders.** Because the first emission unblocks Suspense, `startWith('loading')` fulfills immediately with `"loading"`. For placeholder / loading-value patterns, use `useObservable` instead.

**Options**

```ts
useObservablePromise(observable$, {
  disabled?: boolean // default false — when true, this component starts no fetch
  ttl?: number // default 500 — retention (ms) after settle with no subscribers
})
```

Unlike `useObservable`'s `disabled` (which still runs a warm-up probe), `disabled: true` here fully prevents fetching on behalf of this component. The returned promise is still the shared cache entry — a sibling or `preloadObservablePromise` can warm it.

`ttl` controls how long a settled value stays reusable after unmount. Remount within the window reuses the promise (no refetch, no fallback). After it expires, the next mount refetches. Eviction only affects future consumers: components that are still mounted keep their value — hiding an `<Activity>` tree longer than `ttl` never drops what it already rendered.

**Deferring expensive re-renders**

Like every external-store subscription, emission-driven updates render at synchronous priority — React cannot time-slice them directly. If an emission re-renders something expensive, defer the promise itself and memoize the expensive subtree. The synchronous pass then skips the memoized subtree (it still sees the old promise), and its re-render happens at deferred priority: time-sliced, interruptible by urgent updates, and coalesced under rapid emissions.

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

The `memo` is load-bearing: without it the subtree re-renders during the synchronous pass anyway (with the old promise), defeating the deferral — see [deferring re-rendering for a part of the UI](https://react.dev/reference/react/useDeferredValue#deferring-re-rendering-for-a-part-of-the-ui). Swapped promises are always pre-settled, so the deferred subtree never suspends — it just lags by a paint under load. When the stream itself is too chatty, throttling in the pipe (`auditTime`, `throttleTime`) remains the RxJS-native complement.

**Preloading**

Warm the cache outside of render (hover, route loaders) with `preloadObservablePromise`. Calling it starts the source subscription immediately. Pending entries are never timed out — if the observable never emits or completes, the promise stays pending and the subscription stays alive until it settles (or the process tears down). Bound hang risk with RxJS [`timeout`](https://rxjs.dev/api/operators/timeout) (or cancel the source) when the preload can stall:

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

**Which hook when?**

| Need                                                   | Hook                   |
| ------------------------------------------------------ | ---------------------- |
| Live values, timers, subjects, optional `initialValue` | `useObservable`        |
| Controlled inputs / synchronous store updates          | `useSyncObservable`    |
| Async data + Suspense / Activity pre-render            | `useObservablePromise` |

For cold observables you want to share across subscribers yourself, keep using RxJS `shareReplay({bufferSize: 1, refCount: true})` — the hook's `ttl` is a lightweight mount/unmount cache, not a full query cache.

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

The handler is one visible line; every behavior — throttling, deduping, switching to async work — lives on streams derived from the subject, where it can be composed, shared, and tested. Use a module-level `Subject` when the stream is shared across components, or `useState(() => new Subject())` for per-component streams.

There is also a [`useObservableEvent`](/reference#useobservableevent) hook that wires an event callback into a self-subscribed pipeline. We recommend the explicit `Subject` pattern instead: `useObservableEvent` hides the subscription and the data flow inside the hook, which makes components harder to follow as they grow. Reserve it for pipelines that are genuinely event-first, per-component, and side-effect-only.

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

`useObservable` and `useSyncObservable` re-throw stream errors during render, so an unhandled error surfaces at the nearest [Error Boundary](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary) — see the [error handling example](/examples/errors). When errors should render as UI instead (a retry button, a degraded state), catch them in the stream and emit a value, as in the retry pattern above. `useObservablePromise` rejects its promise, which `use()` routes to the Error Boundary the same way.

### Keep observables referentially stable

react-rx caches subscriptions and snapshots by the observable's **reference identity**. An observable recreated on every render resubscribes on every render — refetch loops, timers restarting, `useObservablePromise` stuck on its fallback. Guarantee stability one of these ways:

1. Module scope (or a store/context that owns the stream).
2. `useState(() => new Subject())` for per-component subjects.
3. `useMemo(() => ..., [deps])` with deps that are themselves stable.
4. The [React Compiler](https://react.dev/learn/react-compiler), which auto-memoizes construction — react-rx's test suite runs through it.

Watch the inputs too: a fresh `[]` or `{}` passed as a param or `initialValue` on every render can silently defeat a `useMemo` one level down. Stabilize object-ish inputs by value before they enter a dependency list.

# Getting Started

## Installation

```sh npm2yarn
npm i react-rx rxjs
```

## The mental model

react-rx keeps a strict division of labor:

- **Streams own behavior.** Fetching, retrying, debouncing, accumulating, combining. All composed in RxJS, outside of render or in a `useMemo`.
- **Hooks own lifecycle.** A hook subscribes when the component commits, tears down on unmount, and re-renders when the stream emits. You never call `.subscribe()` in a component.
- **Events push into a Subject.** A plain event handler pushes a value. Streams derive from it.

```tsx
// Events push into a Subject…
const [query$, handleQuery] = useObservableSubject<string>()
// …behavior lives on derived streams…
const results$ = useMemo(() => query$.pipe(debounceTime(300), switchMap(search)), [query$])
// …and hooks read the streams.
const query = useSyncObservable(query$, '') // controlled input, so synchronous
const results = useObservable(results$, null) // everything else, deferred
```

This page is for copy-paste: signatures, options, and recipes.

Prefer to learn by tinkering? Walk the runnable examples instead: [First steps](/examples/simple), then [Basic state](/examples/basic-state), then [Timers & time ago](/examples/timers).

## Which hook should I use?

| Need                                                | Hook                   |
| --------------------------------------------------- | ---------------------- |
| Live values, timers, subjects (with `initialValue`) | `useObservable`        |
| Controlled inputs / synchronous store updates       | `useSyncObservable`    |
| No meaningful `initialValue`, Suspense, Activity    | `useObservablePromise` |
| Events pushed from handlers                         | `useObservableSubject` |

**Default to `useObservable`.** Store updates are deferred, so lists, previews, and validation stay responsive. It also plays nicely with Suspense.

When not to use it:

- Controlled inputs. Deferred updates can lag the caret.
- One-shot async where the loading UI is a Suspense fallback. Use `useObservablePromise` for that.

**Reach for `useSyncObservable`** in two cases only:

- The value feeds a controlled input. Synchronous updates keep the caret and IME intact.
- The value must be read back synchronously in the same event.

Don't make it your default. Synchronous store updates cannot be marked as Transitions, so a suspending child replaces visible content with a fallback.

**Reach for `useObservablePromise`** when "waiting for the first value" should render as a `<Suspense>` fallback. Don't use it on streams that `startWith(...)` a placeholder. The placeholder counts as the first emission, so the promise fulfills instantly with it.

**Reach for `useObservableSubject`** when a component turns its own event handlers into a stream. See [handling events](#handling-events).

Each hook's [API reference](/reference) has a full "When not to use" list. See [Suspense & deferred values](/examples/suspense) for a side-by-side demo. Upgrading? Start with the [v6 to v7 migration guide](/migrate/v6-to-v7).

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

**`initialValue` is required.** It is what the component renders until the observable emits.

- Every value is a valid initial value, `undefined` included. Pass it explicitly.
- Omitting the argument throws during render.
- Functions act as initializers, exactly like `useState`. Pass `() => value` to compute the initial value lazily. When the initial value should itself be a function, return it from an initializer.

**The observable is never subscribed during render.** Every render shows the `initialValue`, or the last emission of a shared entry that is already live. The subscription starts when the component commits.

- An observable that emits _synchronously_ at subscription time (`of`, `startWith`, a `BehaviorSubject`) replaces the `initialValue` right after that commit.
- Subscribe-time side effects, like a `fromFetch` request, stay out of the render phase. The server included.
- This holds for the first render and for every identity change alike.

**Keep the observable's identity stable** across renders: `useMemo`, `useState`, module scope, or React Compiler memoization.

An observable rebuilt on every render is re-subscribed on every render, just like `useSyncExternalStore`'s `subscribe`. If it then synchronously replays a value that differs from the `initialValue`, the resulting re-render builds yet another identity and the component loops forever.

```tsx
import {useMemo} from 'react'
import {useObservable} from 'react-rx'
import {of} from 'rxjs'

// The first render shows "mars". The synchronous emission "world" takes over
// right after mount, once the live subscription delivers it.
function MyComponent(props) {
  const observable = useMemo(() => of('world'), [])
  const planet = useObservable(observable, 'mars')

  return <>Hello {planet}!</>
}
```

No initial value makes sense for your observable? Want to show fallback UI while it is "loading"? That is what [`useObservablePromise`](#useobservablepromise) is for. It returns a `use()`-compatible promise that suspends until the first emission instead of painting a placeholder value.

`useObservable` and `useSyncObservable` differ in how _updates_ propagate (deferred vs synchronous), not in the first render. On the server both hooks render the resolved `initialValue`, exactly what the first client paint will show, and neither ever subscribes the observable there.

**The `disabled` option** pauses the hook's _active_ subscription. Think of it like `pause: true`:

- While `disabled` is `true`, the hook keeps no live subscription. It returns the last value it received, or the `initialValue` if nothing arrived yet.
- Setting `disabled` back to `false` resumes the live subscription.
- A disabled hook performs no subscriptions at all, even when the observable is rebuilt on every render. So `disabled: true` guarantees zero subscriptions until it is re-enabled.

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

That guarantee makes `disabled` the tool for gating observables with subscribe-time side effects:

```tsx
import {useMemo} from 'react'
import {useObservable} from 'react-rx'
import {fromFetch} from 'rxjs/fetch'

function Users({shouldFetch}: {shouldFetch: boolean}) {
  const users$ = useMemo(
    () =>
      fromFetch('https://api.github.com/users?per_page=5', {
        selector: (response) => response.json(),
      }),
    [],
  )
  // Nothing subscribes during render, and `disabled` skips the commit-time
  // subscription too. The request is guaranteed not to fire until
  // `shouldFetch` becomes true.
  const users = useObservable(users$, null, {disabled: !shouldFetch})

  return <pre>{JSON.stringify(users, null, 2)}</pre>
}
```

### useSyncObservable()

Same signature as `useObservable`, but updates are synchronous (the v4 default). Use it for controlled inputs:

```tsx
import type {ChangeEvent} from 'react'
import {useMemo} from 'react'
import {useObservableSubject, useSyncObservable} from 'react-rx'
import {map} from 'rxjs'

function SearchField() {
  const [changes$, handleChange] = useObservableSubject<ChangeEvent<HTMLInputElement>>()
  const text$ = useMemo(() => changes$.pipe(map((event) => event.currentTarget.value)), [changes$])
  const text = useSyncObservable(text$, '')

  return <input value={text} onChange={handleChange} />
}
```

### useObservablePromise()

Use this when you want **Suspense-powered data fetching** instead of tracking loading state in the stream.

`useObservable` is built on `useSyncExternalStore`. That is great for live values, but it cannot activate a [`Suspense`](https://react.dev/reference/react/Suspense#what-activates-a-suspense-boundary) boundary, and React 19.2 [`Activity`](https://react.dev/reference/react/Activity#pre-rendering-content-thats-likely-to-become-visible) pre-rendering can only wait on data read with `use(promise)`.

`useObservablePromise` returns an instrumented Promise. Pass it as a prop to a child component, which reads it with React's `use()`. The hook itself does **not** suspend, and mounting renders never subscribe the source.

Place a `<Suspense>` boundary between the hook caller and the child that reads the promise:

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

The boundary placement matters. It has to sit **between** the component calling `useObservablePromise` and the child calling `use()`. Without a boundary in between, the child's suspension propagates to the hook caller itself. A suspended component never commits, so the fetch can never start.

For the same reason, never call `use()` on the promise in the component that created it:

```tsx
function UsersList({users$}) {
  // 🚫 Wrong: suspends this component on its own pending promise before the
  // commit that would start the fetch. It deadlocks. This is unsafe in the
  // same way as use()-ing a promise you created during your own render, and
  // it is intentionally not guarded against.
  const users = use(useObservablePromise(users$))
  return <pre>{JSON.stringify(users, null, 2)}</pre>
}
```

**Semantics**

- Fetching has three triggers:
  - a non-`disabled` hook caller **commits**
  - an already-**live** consumer (committed, visible, subscribed) re-renders with a **new observable**, whose swap render starts the new source so `startTransition` and `useDeferredValue` swaps can settle and commit
  - `preloadObservablePromise` is called
- Mounting renders, hidden [`Activity`](https://react.dev/reference/react/Activity) pre-renders, and `disabled` consumers never trigger fetching from render.
- Suspends until the observable's **first** emission (`firstValueFrom` semantics).
- Later emissions update the UI **without** re-showing the Suspense fallback.
- Sync sources (`of`, `BehaviorSubject`, replayed `shareReplay`) resolve during the hook caller's commit, so a cold mount still shows one fallback pass. Preload the observable, or share an already-settled entry, to render them without a fallback.
- Errors reject the promise and surface through the nearest Error Boundary. Prefer `catchError` on the _inner_ observable when you want graceful degradation instead of a boundary.
- Completing without emitting rejects with RxJS `EmptyError`.

Swapping to a **different** observable returns a new pending promise, so a sync swap shows the fallback again. To keep the previous content visible instead:

- change the observable inside [`startTransition`](https://react.dev/reference/react/startTransition), or
- read the promise through [`useDeferredValue`](https://react.dev/reference/react/useDeferredValue), React's [refetch pattern](https://react.dev/reference/react/use#re-fetching-data-in-client-components)

Both also give you a staleness signal (`isPending`, or `deferredPromise !== promise`) to dim stale content while the new data loads. The live consumer's swap render starts the fetch itself. Preloading first, on hover for example, is optional and lets the swap commit with no pending period. See the [Transitions and refetching example](/examples/transitions).

**Activity**

A hidden `<Activity>` tree that calls the hook is fully paused. No subscription, no fetching, until it is revealed and effects mount.

To pre-render hidden content _with_ data, own the promise in a visible component and pass it into the hidden tree. There `use(promise)` lets React pre-render in the background, and suspend only while the observable has not emitted yet:

```tsx
function PrerenderedTab({tab, active}) {
  // Visible owner: its commit starts the fetch.
  const promise = useObservablePromise(fetchTab$(tab))
  return (
    <Activity mode={active ? 'visible' : 'hidden'}>
      <Suspense fallback={<Spinner />}>
        <TabPanel promise={promise} />
      </Suspense>
    </Activity>
  )
}
```

**Not for `startWith` placeholders.** Because the first emission unblocks Suspense, `startWith('loading')` fulfills with `"loading"`. For placeholder and loading-value patterns, use `useObservable` instead.

**Options**

```ts
useObservablePromise(observable$, {
  disabled?: boolean // default false. When true, this component starts no fetch
  ttl?: number // default 500. Retention (ms) after settle with no subscribers
})
```

Like `useObservable`'s `disabled`, `disabled: true` fully prevents fetching on behalf of this component. It skips the commit-time store subscription, so it also receives no re-render notifications for later emissions. The returned promise is still the shared cache entry, so a sibling or `preloadObservablePromise` can warm it.

`ttl` controls how long a settled value stays reusable after unmount:

- Remount within the window reuses the promise. No refetch, no fallback.
- After it expires, the next mount refetches.
- Eviction only affects future consumers. Components that are still mounted keep their value, so hiding an `<Activity>` tree longer than `ttl` never drops what it already rendered.

**Deferring expensive re-renders**

Like every external-store subscription, emission-driven updates render at synchronous priority. React cannot time-slice them directly.

If an emission re-renders something expensive, defer the promise itself and memoize the expensive subtree. The synchronous pass then skips the memoized subtree, since it still sees the old promise. Its re-render happens at deferred priority: time-sliced, interruptible by urgent updates, and coalesced under rapid emissions.

```tsx
const BigChart = memo(function BigChart({promise}) {
  const data = use(promise)
  return <Chart data={data} />
})

function Dashboard({metrics$}) {
  const promise = useObservablePromise(metrics$)
  const deferredPromise = useDeferredValue(promise)
  return (
    <Suspense fallback={<ChartSkeleton />}>
      <BigChart promise={deferredPromise} />
    </Suspense>
  )
}
```

Two details make this work:

- **The `memo` is required.** Without it the subtree re-renders during the synchronous pass anyway, with the old promise, which defeats the deferral. See [deferring re-rendering for a part of the UI](https://react.dev/reference/react/useDeferredValue#deferring-re-rendering-for-a-part-of-the-ui).
- **So is the boundary between `Dashboard` and `BigChart`.** `Dashboard` must commit while `BigChart` suspends on the initial pending promise, because that commit starts the fetch.

Swapped promises are always pre-settled, so after the first load the deferred subtree never re-suspends. It just lags by a paint under load. When the stream itself is too chatty, throttling in the pipe (`auditTime`, `throttleTime`) remains the RxJS-native complement.

**Preloading**

Warm the cache before any consumer is live with `preloadObservablePromise`: on hover, in route loaders, or ahead of a transition swap.

- Calling it starts the source subscription immediately, before any component has committed. That also makes it the tool for sync sources that should mount without a fallback.
- On the server it is a no-op, so a preload in shared code only takes effect in the browser.
- Pending entries are never timed out. If the observable never emits or completes, the promise stays pending and the subscription stays alive until it settles, or until the process tears down. Bound that hang risk with RxJS [`timeout`](https://rxjs.dev/api/operators/timeout), or cancel the source, when the preload can stall.

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

**Server rendering and Server Components**

react-rx is a **client-only** library. Every export ships behind `'use client'`, and observables are **never subscribed on the server**. There is no unmount to tear down a server-started subscription, a never-settling source would keep it (and the response stream) alive forever, and the module-scope promise cache would be shared across requests.

Concretely:

- `useObservable` and `useSyncObservable` server-render like `useSyncExternalStore`. The server paints the resolved `initialValue`, and the live subscription starts on the client.
- `useObservablePromise` returns a pending promise on the server, so server rendering emits the Suspense fallback. The fetch starts on the client once the hydrated hook caller commits.
- `preloadObservablePromise` is a no-op on the server. It returns an inert, forever-pending promise and subscribes nothing, so preloads in shared code (route loaders) only take effect in the browser.

This is not the library for React Server Components or server-only data flows. Hooks imported from a Server Component are client references and cannot be called there.

Need server-fetched data? Fetch it in the Server Component with async/await or RxJS [`firstValueFrom`](https://rxjs.dev/api/index/function/firstValueFrom), which has the same settle semantics as the hook's promise. Then pass the value, or the un-awaited promise for [`use()`](https://react.dev/reference/react/use#streaming-data-from-server-to-client), as a prop into your client components.

For cold observables you want to share across subscribers yourself, keep using RxJS `shareReplay({bufferSize: 1, refCount: true})`. The hook's `ttl` is a lightweight mount/unmount cache, not a full query cache.

## Handling events

`useObservableSubject` creates a `Subject` for the component. It returns the observable side plus a stable handler that pushes events into it. Read the derived stream with whichever hook fits the read.

This is the same mental model the upcoming [native Observable API](https://github.com/WICG/observable) builds on: events become observables, and state is derived from them.

Here's a component that displays the current value from a range input. The pipeline's emissions _are_ the rendered value. No local `useState` mirror, no `tap`:

```tsx
import {useMemo} from 'react'
import {useObservableSubject, useSyncObservable} from 'react-rx'
import {map} from 'rxjs'

const ShowSliderValue = () => {
  const [input$, handleChange] = useObservableSubject<string>()
  const value$ = useMemo(() => input$.pipe(map((value) => Number(value))), [input$])
  const value = useSyncObservable(value$, 1)

  return (
    <>
      <input
        type="range"
        value={value}
        onChange={(event) => handleChange(event.currentTarget.value)}
        min={1}
        max={10}
      />
      <div>Value is: {value}</div>
    </>
  )
}
```

Pipelines with nothing to render (analytics, persistence) subscribe the observable in an effect instead:

```tsx
import {useEffect} from 'react'
import {useObservableSubject} from 'react-rx'
import {concatMap} from 'rxjs'

function SaveSearchButton({term}: {term: string}) {
  const [saves$, handleSave] = useObservableSubject<string>()

  useEffect(() => {
    const subscription = saves$.pipe(concatMap((t) => saveSearch(t))).subscribe()
    return () => subscription.unsubscribe()
  }, [saves$])

  return <button onClick={() => handleSave(term)}>Save search</button>
}
```

Everything RxJS offers applies on the way from event to value. `debounceTime`, `distinctUntilChanged`, `switchMap`, `scan`, and friends all go in the `pipe`, as in the [search example](/examples/search).

State shared by more than one component belongs in a `Subject` outside the component instead, at module scope or in a store. Same shape, wider scope. The [basic state](/examples/basic-state) examples show both.

For **event-driven Suspense data**, seed a `BehaviorSubject` with the initial query and derive the request stream from it. [`useObservablePromise`](#useobservablepromise) suspends until the first result, and later events swap in new data without re-showing the fallback, while `switchMap` cancels the stale request:

```tsx
import {Suspense, use, useMemo} from 'react'
import {useObservablePromise} from 'react-rx'
import {BehaviorSubject, switchMap} from 'rxjs'
import {fromFetch} from 'rxjs/fetch'

const query$ = new BehaviorSubject('react')

function Search() {
  const results$ = useMemo(
    () =>
      query$.pipe(
        switchMap((query) =>
          fromFetch(`https://api.github.com/search/repositories?q=${query}&per_page=5`, {
            selector: (response) => response.json(),
          }),
        ),
      ),
    [],
  )
  const promise = useObservablePromise(results$)

  return (
    <>
      <input
        defaultValue={query$.getValue()}
        onChange={(event) => query$.next(event.currentTarget.value)}
      />
      <Suspense fallback={<p>Searching…</p>}>
        <Results promise={promise} />
      </Suspense>
    </>
  )
}

function Results({promise}: {promise: Promise<unknown>}) {
  return <pre>{JSON.stringify(use(promise), null, 2)}</pre>
}
```

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
  const state = useObservable(state$, {status: 'loading'} as State)

  if (state.status === 'error') {
    return <button onClick={() => retry$.next(retry$.getValue() + 1)}>Retry</button>
  }
  return state.status === 'loading' ? <Spinner /> : <UserList users={state.users} />
}
```

The same shape covers polling ticks, visibility changes, and form submissions.

### Errors: boundary or value

`useObservable` and `useSyncObservable` re-throw stream errors during render. An unhandled error surfaces at the nearest [Error Boundary](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary), same as a rendering error. See the [error handling example](/examples/errors).

Want errors to render as UI instead, like a retry button or a degraded state? Catch them in the stream with `catchError` and emit a value, as in the retry pattern above.

`useObservablePromise` rejects its promise. `use()` routes that to the Error Boundary the same way.

### Keep observables referentially stable

react-rx caches subscriptions and snapshots by the observable's **reference identity**. An observable recreated on every render resubscribes on every render. Symptoms: refetch loops, timers restarting, `useObservablePromise` stuck on its fallback, or a render loop when the stream replays synchronously.

Guarantee stability one of these ways:

1. Module scope, or a store or context that owns the stream.
2. `useObservableSubject()` for per-component event streams, or `useState(() => new Subject())` when you need the writable side.
3. `useMemo(() => ..., [deps])` with deps that are themselves stable.
4. The [React Compiler](https://react.dev/learn/react-compiler), which auto-memoizes construction. react-rx's test suite runs through it.

Watch the inputs too. A fresh `[]` or `{}` passed as a param on every render can silently defeat a `useMemo` one level down. Stabilize object-ish inputs by value before they enter a dependency list.

Lazy `initialValue` functions are safe: like `useState`, the initializer is resolved once per hook instance and never re-run on later renders.

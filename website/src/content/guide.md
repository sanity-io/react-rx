# Getting Started

## Installation

```sh npm2yarn
npm i react-rx rxjs
```

## Observable Hooks

### Which one should I use?

- **Default to `useObservable`** — store updates are deferred, so previews, validation, lists, and other chrome stay responsive and play nicely with Suspense.
- **Reach for `useSyncObservable`** only when the value feeds a controlled input (caret/IME breakage or lost keystrokes under load) or must be read back synchronously in the same event.
- **Reach for `useObservablePromise`** when the observable has no meaningful initial value, or you want fallback UI while waiting for the first emission — it returns a `use()`-compatible promise for Suspense.

See [Suspense & deferred values](/examples/suspense) for a side-by-side demo, and the [v4 → v5 migration guide](/migrate/v4-to-v5) if you are upgrading.

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

The `initialValue` argument is **required**: it is what the component renders until the observable emits. Every value is a valid initial value — `undefined` included, pass it explicitly — and omitting the argument throws during render. Functions act as initializers, exactly like `useState`: pass `() => value` to compute the initial value lazily, and an initializer returning the function when the initial value should be a function itself.

The observable is never subscribed during render. Every render — the first one and every identity change alike — shows the `initialValue` (or the shared entry's last emission), and the subscription starts when the component commits — an observable that emits _synchronously_ at subscription time (`of`, `startWith`, a `BehaviorSubject`, …) replaces the `initialValue` right after that commit. This keeps subscribe-time side effects (for example a `fromFetch` request) out of the render phase.

Keep the observable's identity stable across renders (`useMemo`, `useState`, module scope, or React Compiler memoization). Like `useSyncExternalStore`'s `subscribe`, an observable rebuilt on every render is re-subscribed on every render — and when it synchronously replays a value that differs from the `initialValue`, the resulting re-render builds yet another identity and the component loops forever.

```tsx
import {useMemo} from 'react'
import {useObservable} from 'react-rx'
import {of} from 'rxjs'

// The first render shows "mars"; the synchronous emission "world" takes over
// right after mount, once the live subscription delivers it.
function MyComponent(props) {
  const observable = useMemo(() => of('world'), [])
  const planet = useObservable(observable, 'mars')

  return <>Hello {planet}!</>
}
```

If there is no initial value that makes sense for your observable — or you want to show fallback UI while the observable is "loading" — that is what [`useObservablePromise`](#useobservablepromise) is for: it returns a `use()`-compatible promise that suspends until the first emission instead of painting a placeholder value.

The difference between `useObservable` and `useSyncObservable` is how _updates_ propagate (deferred vs synchronous), not the first render. On the server both hooks render the resolved `initialValue` — exactly what the first client paint will show — and neither ever subscribes the observable there.

The `disabled` option pauses the hook's _active_ subscription — think of it like `pause: true`. While `disabled` is `true`, the hook will not keep a live subscription that pushes updates into the component, and it returns the last value it already received (or the `initialValue` if nothing has been received yet). Turning `disabled` back to `false` resumes the live subscription. A disabled hook performs no subscriptions at all — even when the observable is rebuilt on every render — so `disabled: true` guarantees zero subscriptions until it is re-enabled.

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
  // subscription too — the request is guaranteed not to fire until
  // `shouldFetch` becomes true.
  const users = useObservable(users$, null, {disabled: !shouldFetch})

  return <pre>{JSON.stringify(users, null, 2)}</pre>
}
```

### useSyncObservable()

Same signature as `useObservable`, but updates are synchronous (the previous default). Use it for controlled inputs:

```tsx
import {useSyncObservable} from 'react-rx'
import {Subject} from 'rxjs'

const text$ = new Subject<string>()

function SearchField() {
  const text = useSyncObservable(text$, '')

  return <input value={text} onChange={(event) => text$.next(event.currentTarget.value)} />
}
```

### useObservablePromise()

Use this when you want **Suspense-powered data fetching** instead of tracking loading state in the stream.

`useObservable` is built on `useSyncExternalStore`. That is great for live values, but it cannot activate a [`Suspense`](https://react.dev/reference/react/Suspense#what-activates-a-suspense-boundary) boundary, and React 19.2 [`Activity`](https://react.dev/reference/react/Activity#pre-rendering-content-thats-likely-to-become-visible) pre-rendering can only wait on data read with `use(promise)`.

`useObservablePromise` returns an instrumented Promise meant to be passed as a prop to a child component, which reads it with React's `use()`. The hook itself does **not** suspend, and mounting renders never subscribe the source — the fetch starts when the component that called the hook **commits**, when an already-live consumer swaps to a new observable (see below), or when you call `preloadObservablePromise`. Place a `<Suspense>` boundary between the hook caller and the child that reads the promise:

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

The boundary placement is load-bearing: it must sit **between** the component calling `useObservablePromise` and the child calling `use()`. Without a boundary in between, the child's suspension propagates to the hook caller itself — and a suspended component never commits, so the fetch can never start.

For the same reason, never call `use()` on the promise in the component that created it:

```tsx
function UsersList({users$}) {
  // 🚫 Wrong: suspends this component on its own pending promise before the
  // commit that would start the fetch — it deadlocks. This is unsafe in the
  // same way as use()-ing a promise you created during your own render, and
  // it is intentionally not guarded against.
  const users = use(useObservablePromise(users$))
  return <pre>{JSON.stringify(users, null, 2)}</pre>
}
```

**Semantics**

- Fetching has three triggers: a non-`disabled` hook caller **commits**; an already-**live** consumer (committed, visible, subscribed) re-renders with a **new observable**, whose swap render starts the new source so `startTransition` / `useDeferredValue` swaps can settle and commit; or `preloadObservablePromise` is called. Mounting renders, hidden [`Activity`](https://react.dev/reference/react/Activity) pre-renders, and `disabled` consumers never trigger fetching from render.
- Suspends until the observable's **first** emission (`firstValueFrom` semantics).
- Later emissions update the UI **without** re-showing the Suspense fallback.
- Sync sources (`of`, `BehaviorSubject`, replayed `shareReplay`) resolve during the hook caller's commit, so a cold mount still shows one fallback pass. Preload the observable (or share an already-settled entry) to render them without a fallback.
- Errors reject the promise and surface through the nearest Error Boundary. Prefer `catchError` on the _inner_ observable when you want graceful degradation instead of a boundary.
- Completing without emitting rejects with RxJS `EmptyError`.
- Swapping to a **different** observable returns a new pending promise, so a sync swap shows the fallback again. To keep the previous content visible instead, change the observable inside [`startTransition`](https://react.dev/reference/react/startTransition) or read the promise through [`useDeferredValue`](https://react.dev/reference/react/useDeferredValue), React's [refetch pattern](https://react.dev/reference/react/use#re-fetching-data-in-client-components). Both also give you a staleness signal (`isPending`, or `deferredPromise !== promise`) to dim stale content while the new data loads. The live consumer's swap render starts the fetch itself; preloading first, for example on hover, is optional and lets the swap commit with no pending period. See the [Transitions and refetching example](/examples/transitions).

**Activity**

A hidden `<Activity>` tree that calls the hook is fully paused — no subscription, no fetching — until it is revealed and effects mount. To pre-render hidden content _with_ data, own the promise in a visible component and pass it into the hidden tree, where `use(promise)` lets React pre-render in the background and suspend only while the observable has not emitted yet:

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

**Not for `startWith` placeholders.** Because the first emission unblocks Suspense, `startWith('loading')` fulfills with `"loading"`. For placeholder / loading-value patterns, use `useObservable` instead.

**Options**

```ts
useObservablePromise(observable$, {
  disabled?: boolean // default false — when true, this component starts no fetch
  ttl?: number // default 500 — retention (ms) after settle with no subscribers
})
```

Like `useObservable`'s `disabled`, `disabled: true` fully prevents fetching on behalf of this component: it skips the commit-time store subscription, so it also receives no re-render notifications for later emissions. The returned promise is still the shared cache entry — a sibling or `preloadObservablePromise` can warm it.

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
  return (
    <Suspense fallback={<ChartSkeleton />}>
      <BigChart promise={deferredPromise} />
    </Suspense>
  )
}
```

The `memo` is load-bearing: without it the subtree re-renders during the synchronous pass anyway (with the old promise), defeating the deferral — see [deferring re-rendering for a part of the UI](https://react.dev/reference/react/useDeferredValue#deferring-re-rendering-for-a-part-of-the-ui). The boundary between `Dashboard` and `BigChart` is load-bearing too: `Dashboard` must commit while `BigChart` suspends on the initial pending promise, since that commit starts the fetch. Swapped promises are always pre-settled, so after the first load the deferred subtree never re-suspends — it just lags by a paint under load. When the stream itself is too chatty, throttling in the pipe (`auditTime`, `throttleTime`) remains the RxJS-native complement.

**Preloading**

Warm the cache before any consumer is live (hover, route loaders, ahead of a transition swap) with `preloadObservablePromise`. Calling it starts the source subscription immediately, before any component has committed, which also makes it the tool for sync sources that should mount without a fallback. On the server it is a no-op (see below), so a preload in shared/isomorphic code only takes effect in the browser. Pending entries are never timed out — if the observable never emits or completes, the promise stays pending and the subscription stays alive until it settles (or the process tears down). Bound hang risk with RxJS [`timeout`](https://rxjs.dev/api/operators/timeout) (or cancel the source) when the preload can stall:

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

react-rx is a **client-only** library — every export ships behind `'use client'`, and observables are **never subscribed on the server**. A server-started subscription has no unmount to tear it down, a never-settling source would keep it (and the response stream) alive forever, and the module-scope promise cache would be shared across requests. Concretely:

- `useObservable` / `useSyncObservable` server-render like `useSyncExternalStore`: the server paints the resolved `initialValue` and the live subscription starts on the client.
- `useObservablePromise` returns a pending promise on the server, so server rendering emits the Suspense fallback; the fetch starts on the client once the hydrated hook caller commits.
- `preloadObservablePromise` is a no-op on the server: it returns an inert, forever-pending promise and subscribes nothing, so preloads in shared/isomorphic code (route loaders) only take effect in the browser.

This is not the library for React Server Components or server-only data flows. Hooks imported from a Server Component are client references and cannot be called there. When you need server-fetched data, fetch it in the Server Component with async/await or RxJS [`firstValueFrom`](https://rxjs.dev/api/index/function/firstValueFrom) (same settle semantics as the hook's promise) and pass the value — or the un-awaited promise, for [`use()`](https://react.dev/reference/react/use#streaming-data-from-server-to-client) — as a prop into your client components.

**Which hook when?**

| Need                                                | Hook                                    |
| --------------------------------------------------- | --------------------------------------- |
| Live values, timers, subjects (with `initialValue`) | `useObservable`                         |
| Controlled inputs / synchronous store updates       | `useSyncObservable`                     |
| No meaningful `initialValue`, Suspense, Activity    | `useObservablePromise`                  |
| Events pushed from handlers                         | a `Subject` piped into one of the above |

For cold observables you want to share across subscribers yourself, keep using RxJS `shareReplay({bufferSize: 1, refCount: true})` — the hook's `ttl` is a lightweight mount/unmount cache, not a full query cache.

### Handling events

There is no dedicated event hook — and none is needed. Create a `Subject`, call `subject.next(...)` from the event handler, and read the derived stream with whichever hook fits the read. This is the same mental model the upcoming [native Observable API](https://github.com/WICG/observable) builds on: events become observables, and state is derived from them.

Here's a component that displays the current value from a range input. The pipeline's emissions _are_ the rendered value — no local `useState` mirror, no `tap`:

```tsx
import {useMemo, useState} from 'react'
import {useObservable} from 'react-rx'
import {map, Subject} from 'rxjs'

function ShowSliderValue() {
  const [sliderInput$] = useState(() => new Subject<string>())
  const value$ = useMemo(() => sliderInput$.pipe(map((value) => Number(value))), [sliderInput$])
  const value = useObservable(value$, 1)

  return (
    <>
      <input
        type="range"
        value={value}
        onChange={(event) => sliderInput$.next(event.currentTarget.value)}
        min={1}
        max={10}
      />
      <div>Value is: {value}</div>
    </>
  )
}
```

Creating the `Subject` in `useState` scopes it to the component instance; a module-level `Subject` works just as well when the stream should be shared. Everything RxJS offers applies on the way from event to value — `debounceTime`, `distinctUntilChanged`, `switchMap`, `scan`, and friends all go in the `pipe`, as in the [search example](/examples/search).

For **controlled inputs**, read the subject back with [`useSyncObservable`](#usesyncobservable) so the value updates synchronously:

```tsx
import {useSyncObservable} from 'react-rx'
import {Subject} from 'rxjs'

const text$ = new Subject<string>()

function SearchField() {
  const text = useSyncObservable(text$, '')

  return <input value={text} onChange={(event) => text$.next(event.currentTarget.value)} />
}
```

For **event-driven Suspense data**, seed a `BehaviorSubject` with the initial query and derive the request stream from it. [`useObservablePromise`](#useobservablepromise) suspends until the first result, and later events swap in new data without re-showing the fallback (while `switchMap` cancels the stale request):

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

**Side-effect-only pipelines** (analytics, persistence, …) that produce nothing to render can subscribe in an effect — the event handler stays a plain `subject.next` call:

```tsx
import {useEffect} from 'react'
import {concatMap, Subject} from 'rxjs'

const savedSearches$ = new Subject<string>()

function SaveSearchButton({term}: {term: string}) {
  useEffect(() => {
    const subscription = savedSearches$.pipe(concatMap((t) => saveSearch(t))).subscribe()
    return () => subscription.unsubscribe()
  }, [])

  return <button onClick={() => savedSearches$.next(term)}>Save search</button>
}
```

> Earlier versions shipped a `useObservableEvent` hook that wrapped this pattern; it was removed in v7. See the [v6 → v7 migration guide](/migrate/v6-to-v7).

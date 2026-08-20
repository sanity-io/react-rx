# Getting Started

## Installation

```sh npm2yarn
npm i react-rx rxjs
```

## Observable Hooks

### Which one should I use?

- **Default to `useObservable`** — store updates are deferred, so previews, validation, lists, and other chrome stay responsive and play nicely with Suspense.
- **Reach for `useSyncObservable`** only when the value feeds a controlled input (caret/IME breakage or lost keystrokes under load) or must be read back synchronously in the same event. It is also the hook with the strict v4 SSR contract (server renders the `initialValue`, throws without one).

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

The `initialValue` argument is optional, and it also decides how the hook treats observables that emit _synchronously_ at subscription time (`of`, `startWith`, a `BehaviorSubject`, …):

- **Without an `initialValue`**, the hook briefly subscribes during render so a synchronous emission can be returned from the very first render. If the observable only emits asynchronously, the value may be `undefined` initially.
- **With an `initialValue`**, the observable is not subscribed during render at all. The first render shows the `initialValue`, and the subscription starts when the component commits — a synchronous emission then replaces the `initialValue` right after mount. This keeps subscribe-time side effects (for example a `fromFetch` request) out of the render phase whenever you already have a value to paint first.

```tsx
import {useMemo} from 'react'
import {useObservable} from 'react-rx'
import {of} from 'rxjs'

// The observable emits "world" synchronously and no initialValue is given, so this
// component renders "Hello world!" from the very first render — never an empty value.
function MyComponent(props) {
  const observable = useMemo(() => of('world'), [])
  const planet = useObservable(observable)

  return <>Hello {planet}!</>
}
```

Had this component passed an `initialValue` — `useObservable(observable, 'mars')` — the first render would show `"mars"`, with `"world"` taking over right after mount once the live subscription delivers the synchronous emission.

The difference between `useObservable` and `useSyncObservable` is how _updates_ propagate (deferred vs synchronous), not the first render. On the server, `useObservable` paints what the first client render will show — a synchronous emission when no `initialValue` is given (here `"world"`), else the resolved `initialValue` — and never throws, while `useSyncObservable` always paints the `initialValue` and throws without one.

The `disabled` option pauses the hook's _active_ subscription — think of it like `pause: true`. While `disabled` is `true`, the hook will not keep a live subscription that pushes updates into the component, and it returns the last value it already received (or the `initialValue` if nothing has been received yet). Turning `disabled` back to `false` resumes the live subscription.

Important: when no `initialValue` is given, `disabled` does **not** skip the hook's warm-up subscription — both hooks still briefly subscribe during render so a synchronous emission can become the current snapshot, which means cold observables with subscribe-time side effects (for example `fromFetch`) still run that work even when `disabled` is `true`. With an `initialValue` there is no warm-up at all, so `disabled: true` guarantees zero subscriptions until it is re-enabled.

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

If the goal is to avoid _any_ subscription to a particular observable, the simplest option is to combine an `initialValue` with `disabled` — with an `initialValue` there is no render-phase warm-up, so nothing subscribes until `disabled` flips to `false`:

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
  // With an initialValue there is no render-phase warm-up, so the request is
  // guaranteed not to fire until `shouldFetch` becomes true.
  const users = useObservable(users$, null, {disabled: !shouldFetch})

  return <pre>{JSON.stringify(users, null, 2)}</pre>
}
```

When you cannot provide an `initialValue` (you want the synchronous emission on the first render), `disabled` alone is not enough — the warm-up subscribe would still fire the request. In that case pass a different observable instead, for example swap in `of(null)` until you are ready to fetch:

```tsx
import {useMemo} from 'react'
import {useObservable} from 'react-rx'
import {of} from 'rxjs'
import {fromFetch} from 'rxjs/fetch'

function Users({shouldFetch}: {shouldFetch: boolean}) {
  const users$ = useMemo(
    () =>
      shouldFetch
        ? fromFetch('https://api.github.com/users?per_page=5', {
            selector: (response) => response.json(),
          })
        : of(null),
    [shouldFetch],
  )
  const users = useObservable(users$)

  return <pre>{JSON.stringify(users, null, 2)}</pre>
}
```

Because the fetch observable is only created (and therefore only ever subscribed) when `shouldFetch` is true, this guarantees zero subscriptions to `fromFetch` until then.

### useSyncObservable()

Same signature as `useObservable`, but updates are synchronous (the previous default). Use it for controlled inputs:

```tsx
import type {ChangeEvent} from 'react'
import {useObservableEvent, useSyncObservable} from 'react-rx'
import {map, Subject, tap, type Observable} from 'rxjs'

const text$ = new Subject<string>()

function SearchField() {
  const handleChange = useObservableEvent((events$: Observable<ChangeEvent<HTMLInputElement>>) =>
    events$.pipe(
      map((e) => e.currentTarget.value),
      tap((value) => text$.next(value)),
    ),
  )
  const text = useSyncObservable(text$, '')

  return <input value={text} onChange={handleChange} />
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

Unlike `useObservable`'s `disabled` (which still runs a warm-up probe when no `initialValue` is given), `disabled: true` here fully prevents fetching on behalf of this component. The returned promise is still the shared cache entry — a sibling or `preloadObservablePromise` can warm it.

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
| Event → observable pipelines                           | `useObservableEvent`   |

For cold observables you want to share across subscribers yourself, keep using RxJS `shareReplay({bufferSize: 1, refCount: true})` — the hook's `ttl` is a lightweight mount/unmount cache, not a full query cache.

### useObservableEvent()

This creates an event handler that can be used to create an observable from events.

Here's an example of a component that displays the current value from a range input:

```tsx
import {useState} from 'react'
import {useObservableEvent} from 'react-rx'
import {filter, map, tap} from 'rxjs'

const ShowSliderValue = () => {
  const [value, setValue] = useState(1)
  const handleChange = useObservableEvent((value$) =>
    value$.pipe(
      // Ignore nullish values
      filter(nonNullable),
      // Cast to number
      map((value) => Number(value)),
      // Update local state
      tap(setValue),
    ),
  )

  return (
    <>
      <input
        type="range"
        value={value}
        onChange={(event) => handleChange(event.target.value)}
        min={1}
        max={10}
      />
      <div>Value is: {value}</div>
    </>
  )
}

function nonNullable<T>(v: T): v is NonNullable<T> {
  return v != null
}
```

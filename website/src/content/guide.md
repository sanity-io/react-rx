# Using react-rx

This guide assumes you know the basics of React hooks and RxJS observables. If RxJS is new to you,
start with its [introduction to observables](https://rxjs.dev/guide/observable).

## Installation

```sh npm2yarn
npm i react-rx rxjs
```

You need React `^19.2` and RxJS `^7.2`. Import operators from `rxjs`, not `rxjs/operators`.

## From a stream to a component

An observable describes a sequence of values. A subscription starts listening to that sequence.
react-rx manages that subscription for a React component and gives you a value to render.

Keep the two jobs separate: use RxJS to decide which values reach the component, and use React to
display them. For example, a search stream can wait for a pause in typing and cancel an older request.
The component only needs to render the results.

## Observable Hooks

### Which one should I use?

| You want to…                                               | Start with             |
| ---------------------------------------------------------- | ---------------------- |
| Display a value from an observable                         | `useObservable`        |
| Use that value to control an input                         | `useSyncObservable`    |
| Show a Suspense fallback while waiting for the first value | `useObservablePromise` |
| Send events from a component into a stream                 | `useObservableSubject` |

The first two hooks need an initial value. The promise hook lets Suspense provide the loading UI
instead. The subject hook creates an event stream; it does not subscribe to it.

You can use more than one hook with the same stream. For example, an input can use
`useSyncObservable` while its results list uses `useObservable`.

### useObservable()

Start here for values you want to display. Pass an observable and an initial value:

```tsx
import {useMemo} from 'react'
import {useObservable} from 'react-rx'
import {timer} from 'rxjs'

function ElapsedTime() {
  const seconds$ = useMemo(() => timer(0, 1000), [])
  const seconds = useObservable(seconds$, 0)

  return <p>{seconds} seconds elapsed</p>
}
```

The first render shows `0`. The subscription starts when React commits the component, not while it
renders. Even a `BehaviorSubject` that supplies a value immediately must wait for that subscription.
If another component is already reading the same observable, the hook can use its latest shared value.

Later updates are deferred: React can finish urgent work, such as typing, before updating this
component. Until then, the component keeps its previous value.

**Choosing an initial value.** The argument is required; omitting it throws. Pass `undefined`
explicitly if that is the value you want. Like `useState`, the hook accepts an initializer function
and stores its result for that hook instance. To store a function as the value, wrap it in an
initializer: `() => myFunction`.

**Keeping the observable stable.** The `useMemo` above keeps the same timer across renders.
Without it, each render would create a new timer and restart the subscription. Sources that emit
immediately can even cause a render loop. See [keeping observables stable](#keeping-observables-stable)
for streams that depend on props.

**Pausing a subscription.** Pass `{disabled: true}` to stop this hook from subscribing. It keeps
the last value it received, or the initial value if it has received nothing yet. Re-enable it to
subscribe again. Other components can still subscribe to the same observable.

For example, this request only starts on behalf of `Users` when `shouldFetch` is true:

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
  const users = useObservable(users$, null, {disabled: !shouldFetch})

  return <pre>{JSON.stringify(users, null, 2)}</pre>
}
```

### useSyncObservable()

Use this when an observable supplies a controlled input's value. The input needs each edit immediately;
deferring it can interfere with typing. The arguments and initial-value rules are the same as
`useObservable`; only the update timing differs.

```tsx
import {useObservableSubject, useSyncObservable} from 'react-rx'

function SearchField() {
  const [text$, setText] = useObservableSubject<string>()
  const text = useSyncObservable(text$, '')

  return <input value={text} onChange={(event) => setText(event.currentTarget.value)} />
}
```

If a child suspends in response to one of these updates, React can replace visible content with the
nearest Suspense fallback. Prefer `useObservable` for results, previews, and other values that do not
control the input. The [side-by-side example](/examples/suspense) shows the difference.

### useObservablePromise()

Use this when there is no useful initial value and you want Suspense to show a loading state.
Unlike `useObservable`, it returns a promise rather than the value itself.

Call the hook in a parent, pass the promise to a child, and read it there with React's `use()`.
Place a `<Suspense>` boundary between them:

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

The parent must be able to commit while the child waits. That commit starts the subscription.
Without a boundary between them, the parent also suspends and the request cannot start.

For the same reason, do not combine the two calls in one component:

```tsx
function UsersList({users$}) {
  // This component waits for a subscription it cannot start until it commits.
  const users = use(useObservablePromise(users$))
  return <pre>{JSON.stringify(users, null, 2)}</pre>
}
```

**What happens as values arrive**

- The child shows the Suspense fallback until the first value arrives.
- Later values from the same observable update the content without showing the fallback again.
- Stream errors reach the nearest Error Boundary. Completing without a value rejects with RxJS
  `EmptyError`.
- A fresh subscription to a synchronous source still needs the parent's commit. To avoid its initial
  fallback, preload the source or reuse an already-settled cache entry.

The hook does not wait for the observable to complete. It keeps listening after the first value.
Do not add `startWith('loading')` to a stream used this way: `"loading"` would count as the first
value and immediately replace the fallback. Use `useObservable` for loading states represented as
stream values.

**Changing the observable**

A different observable gets its own promise. If it is not already settled, the child can show a
fallback again. Wrap the change in [`startTransition`](https://react.dev/reference/react/startTransition)
or defer the promise with [`useDeferredValue`](https://react.dev/reference/react/useDeferredValue)
to keep existing content visible while the next value loads.

There is an important difference from the initial mount: when a visible, subscribed component
switches to a new observable, the hook starts that source during the update render. This lets a
transition finish without waiting for a commit that is itself waiting for data. Initial renders,
hidden components, and disabled hooks do not start subscriptions this way.

Try [transitions and refetching](/examples/transitions) to see both approaches.

**Activity**

A hook inside a hidden `<Activity>` does not subscribe until the activity is shown. To load data
while a tab is hidden, call the hook in a visible parent and pass its promise into the hidden tree:

```tsx
function PrerenderedTab({tab$, active}) {
  const promise = useObservablePromise(tab$)
  return (
    <Activity mode={active ? 'visible' : 'hidden'}>
      <Suspense fallback={<Spinner />}>
        <TabPanel promise={promise} />
      </Suspense>
    </Activity>
  )
}
```

Here `tab$` is a stable observable supplied by the parent. The [Activity example](/examples/activity)
compares loading on reveal with loading ahead of time.

**Options**

| Option     | Default | What it does                                                                        |
| ---------- | ------- | ----------------------------------------------------------------------------------- |
| `disabled` | `false` | Stops this component from subscribing or receiving update notifications.            |
| `ttl`      | `500`   | Keeps a settled cache entry for this many milliseconds after it has no subscribers. |

A disabled hook still returns the shared promise. Another component or a preload can resolve it.

Remounting within `ttl` reuses the settled promise. After eviction, a new consumer starts a new
subscription. Eviction does not erase values held by mounted components, including hidden
activities.

**Deferring expensive re-renders**

Unlike `useObservable`, the promise hook does not defer stream updates by default. If rendering the
result is expensive, defer the promise and memoize the child:

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

`memo` lets the chart skip the urgent render while it still has the old promise. React can then
render the new chart in the background. Keep the Suspense boundary between the hook and the child
for the initial load.

For more, see React's [guide to deferring a subtree](https://react.dev/reference/react/useDeferredValue#deferring-re-rendering-for-a-part-of-the-ui).
If you also need fewer stream values, use RxJS operators such as `auditTime` or `throttleTime`.

**Preloading**

Call `preloadObservablePromise` in the browser to start listening before a component needs the data.
For example, you can preload when someone hovers over a tab:

```tsx
import {preloadObservablePromise} from 'react-rx'

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

The component must use the **same observable object** as the preload to reuse its result.
Preloading subscribes immediately in the browser and does nothing on the server. Its default `ttl`
is 5,000 ms, compared with the hook's 500 ms.

`ttl` does not time out a pending request. If a source might never emit or complete, give it an RxJS
[`timeout`](https://rxjs.dev/api/operators/timeout) or another cancellation mechanism.

See the [Async React demo](https://async-react.sanity.dev/) for preloading in a complete application.

**Server rendering and Server Components**

react-rx hooks belong in Client Components. Those components can still render HTML on the server,
but react-rx never subscribes to their observables there.

- The value hooks render the initial value.
- The promise hook returns a pending promise, so the child shows its Suspense fallback.
- Preloading does not start a request.

Subscriptions start on the client after hydration. Choose a deterministic initial value so the
server markup matches the client's first render.

For data that must be fetched on the server, use your framework's server-data facilities and pass
the result into a Client Component. You can also pass a server-created promise for React's
[`use()`](https://react.dev/reference/react/use#streaming-data-from-server-to-client) to read.

### Handling events

`useObservableSubject` returns an observable and a handler that sends values into it. Both stay
stable across renders. Use it when a component event needs RxJS processing.

This slider sends strings into a stream, converts them to numbers, and reads the result:

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

Extract `event.currentTarget.value` in the event handler, as above. Do not pass a DOM event into
a delayed pipeline and try to read `currentTarget` later.

The hook uses a plain `Subject`: events sent before anything subscribes are lost. It does not store
an initial value or replay past events. Use a `BehaviorSubject` when late subscribers need the
current value.

If all you need is the slider's local value, `useState` is simpler. This pattern becomes useful
when you add stream behavior such as debouncing, combining inputs, or cancelling requests.

For work that renders no value, keep the subscription in an effect. In this example, `saveSearch`
is an application function that returns a promise or observable:

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

`concatMap` queues saves in order. Unmounting unsubscribes the pipeline; if every save must finish
even after navigation, its owner should live outside this component.

For a search that uses Suspense, give each search component a `BehaviorSubject` with an initial
query. It starts a request as soon as the promise hook subscribes:

```tsx
import {Suspense, use, useMemo, useState} from 'react'
import {useObservablePromise} from 'react-rx'
import {BehaviorSubject, switchMap} from 'rxjs'
import {fromFetch} from 'rxjs/fetch'

function Search() {
  const [query$] = useState(() => new BehaviorSubject('react'))
  const results$ = useMemo(
    () =>
      query$.pipe(
        switchMap((query) =>
          fromFetch(
            `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&per_page=5`,
            {
              selector: (response) => response.json(),
            },
          ),
        ),
      ),
    [query$],
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

The first result replaces the fallback. Later queries keep the existing results visible until new
ones arrive. `switchMap` unsubscribes from the old request, and `fromFetch` aborts it. This example
does not show a new loading indicator for each query; use explicit stream state if you need one.

## Keeping observables stable

Hooks identify a stream by its observable object, not by the data or URL inside it. Two calls to
`fromFetch(url)` create two different observables.

- Put a stream outside the component when it should be shared and does not depend on props.
- Use `useMemo` for a stream built from props, with those props in the dependency list.
- Use a lazy `useState` initializer for a subject owned by one component instance.
- If React Compiler already memoizes the expression, do not add redundant wrappers. Check that
  the component is actually compiled before relying on that behavior.

Keep request creation lazy, too. `fromFetch` starts on subscription; `from(fetch(url))` starts
`fetch` as soon as the expression runs. Use `defer(() => fetch(url))` when adapting an eager API.

When a prop selects a different stream, `useObservable` does not show the old stream's value under
the new prop. It uses the new stream's available value or the hook's initial value. If you want to
keep the old results during a refresh, model that explicitly in the stream or use a
[transition with the promise hook](/examples/transitions).

## Loading, errors, and retries

Decide what the component should display before choosing operators.

**Use a boundary for a failed section.** Unhandled stream errors reach an Error Boundary. This works
when the whole section should be replaced with an error message.

**Use values for recoverable states.** If the user should keep seeing results alongside a retry
button, emit a state such as `{status: 'error', data, error}`. Read it with `useObservable` and give
the hook a matching initial state.

**Recover inside each request.** Put `catchError` inside `switchMap` when later searches or refresh
events must still work. Catching outside it replaces the whole event stream, so later events no
longer start requests.

**Retry deliberately.** Put `retry` on the request, with a bounded count and a delay. A retry
resubscribes; use a cold request observable so it makes a new attempt. Do not automatically retry
non-idempotent writes unless the API makes that safe.

**Keep useful results.** Use `scan` to carry the last successful data through loading and error
states. Use a refresh event to start another request rather than a second subscription that
updates separate React state.

Try the [search](/examples/search), [form submission](/examples/form-data), and
[error handling](/examples/errors) examples to see different choices.

## Choosing between libraries

react-rx is a way to read observables in React, not a requirement to use observables everywhere.

| If your main need is…                                 | Consider                            |
| ----------------------------------------------------- | ----------------------------------- |
| Local component state                                 | React's `useState` or `useReducer`  |
| Shared application state                              | Zustand or Jotai                    |
| Explicit states and allowed transitions               | XState                              |
| Request caching, invalidation, and refetch policies   | TanStack Query                      |
| Combining events, timing, cancellation, and live data | RxJS, with react-rx for React reads |

These tools can coexist. For example, a page can use a query cache for server data and an observable
for upload progress. The promise hook's `ttl` only retains an observable's result briefly; it is
not a query cache with keys and invalidation policies.

If you are already choosing between RxJS bindings, [observable-hooks](https://observable-hooks.js.org/)
and [React-RxJS](https://react-rxjs.org/) are other options. Compare their subscription lifecycle,
initial-value rules, and Suspense model with what your application needs. react-rx's defaults are
explicit initial values, subscriptions after commit for its value hooks, and deferred display
updates. Controlled inputs and Suspense have separate hooks.

A hand-written effect is still appropriate for imperative work with clear cleanup. Prefer a
react-rx hook when that effect's only purpose is copying the latest stream value into React state.

# Using react-rx

react-rx lets a React component read the current value of an RxJS observable. RxJS decides how a
value changes over time; react-rx manages the subscription and re-renders the component. This is the
quick reference, and every concept links to a runnable lesson you can edit in the browser. It assumes
you know React hooks and the basics of RxJS — if observables are new, read the
[RxJS introduction](https://rxjs.dev/guide/observable) first.

## Installation

```sh npm2yarn
npm i react-rx rxjs
```

You need React `^19.2` and RxJS `^7.2`. Import operators from `rxjs`, not `rxjs/operators`.

## Choose a hook

| You want to…                                           | Use                    |
| ------------------------------------------------------ | ---------------------- |
| Display a value from an observable                     | `useObservable`        |
| Drive a controlled input from an observable            | `useSyncObservable`    |
| Show a Suspense fallback until the first value arrives | `useObservablePromise` |
| Send component events into a stream                    | `useObservableSubject` |

Two rules to keep in mind:

- **Give the value hooks an initial value.** `useObservable` and `useSyncObservable` require it,
  even if it is `undefined`. On the server they render that value and never subscribe.
- **Keep the observable stable.** The hooks track a stream by object identity. Define it outside the
  component, or memoize it (see [keeping observables stable](#keeping-observables-stable)). A fresh
  observable every render restarts the work.

The value hooks subscribe after React commits, never during render. The promise hook also waits for
the initial commit; once live, it can start a replacement source during an update to support Suspense
transitions.

## useObservable()

Read a value you want to display. Updates are deferred, so React can finish urgent work such as
typing before re-rendering this component.

```tsx
import {useObservable} from 'react-rx'
import {timer} from 'rxjs'

const seconds$ = timer(0, 1000)

function ElapsedTime() {
  const seconds = useObservable(seconds$, 0)
  return <p>{seconds} seconds elapsed</p>
}
```

- The initial value (`0`) shows until the first emission arrives after commit.
- Like `useState`, you can pass an initializer function; wrap a function value in `() => fn`.
- Pass `{disabled: true}` to pause subscribing; the hook keeps its last value.
- Stream errors reach the nearest Error Boundary.

See it in action in [clicks become streams](/examples/simple) and
[timers and time ago](/examples/sync).

## useSyncObservable()

Use this when an observable drives a controlled input. Edits must land synchronously, so these
updates are not deferred. The arguments and initial-value rule match `useObservable`.

```tsx
import {useObservableSubject, useSyncObservable} from 'react-rx'

function SearchField() {
  const [text$, setText] = useObservableSubject<string>()
  const text = useSyncObservable(text$, '')
  return <input value={text} onChange={(event) => setText(event.currentTarget.value)} />
}
```

Prefer `useObservable` for results and previews that follow the input, so a suspending child cannot
replace what the user is typing. The [text fields, checkboxes, and forms lesson](/examples/counters)
shows the difference.

## useObservablePromise()

Use this when there is no useful value to show while waiting. It returns a promise; a child reads it
with React's [`use()`](https://react.dev/reference/react/use) inside a Suspense boundary.

```tsx
import {Suspense, use} from 'react'
import {useObservablePromise} from 'react-rx'

function Users({users$}) {
  const promise = useObservablePromise(users$)
  return (
    <Suspense fallback={<p>Loading…</p>}>
      <UsersList promise={promise} />
    </Suspense>
  )
}

function UsersList({promise}: {promise: Promise<unknown>}) {
  return <pre>{JSON.stringify(use(promise), null, 2)}</pre>
}
```

- **Put the Suspense boundary between the hook and the `use()` call.** The parent must commit to
  start the subscription; reading the promise in the same component deadlocks it.
- The first value replaces the fallback; later values update the content without it.
- Errors reach the nearest Error Boundary. Completing with no value rejects with RxJS `EmptyError`.
  Don't use `startWith('loading')` to request a fallback: that is a value, so it resolves the promise.
- `preloadObservablePromise(users$)` starts listening early in the browser (for example on hover);
  the component must use the **same observable object**. A hook inside a hidden `<Activity>` only
  subscribes once shown, so preload or pass the promise from a visible parent.

Lessons: [load data with Suspense](/examples/data-fetching),
[transitions and refetching](/examples/transitions), [Activity and preload](/examples/activity),
[streaming chat](/examples/streaming-chat), and [resilient fetch](/examples/resilient-fetch).

## Handling events

`useObservableSubject` returns a stable observable and a handler that pushes values into it. Reach
for it when a component event needs RxJS processing — debouncing, combining inputs, cancelling
requests.

```tsx
import {useMemo} from 'react'
import {useObservableSubject, useSyncObservable} from 'react-rx'
import {map} from 'rxjs'

function Slider() {
  const [input$, handleChange] = useObservableSubject<string>()
  const value$ = useMemo(() => input$.pipe(map(Number)), [input$])
  const value = useSyncObservable(value$, 1)
  return (
    <input
      type="range"
      value={value}
      min={1}
      max={10}
      onChange={(event) => handleChange(event.currentTarget.value)}
    />
  )
}
```

- Read `event.currentTarget.value` inside the handler; don't defer a DOM event and read it later.
- It uses a plain `Subject`: events emitted before anything subscribes are lost. Use a
  `BehaviorSubject` when late subscribers need the current value.
- For work that renders nothing (analytics, persistence), subscribe the returned observable in an
  effect and unsubscribe on cleanup.

Lessons: [search as you type](/examples/search), [build a list from events](/examples/todo-app),
and [save form data](/examples/form-data).

## Keeping observables stable

The hooks identify a stream by its object, not by the URL or data inside it. Two calls to
`fromFetch(url)` are two different observables.

- Define a shared, prop-independent stream outside the component.
- Use `useMemo` for a stream built from props, with those props in the dependency list.
- Use a lazy `useState` initializer for a subject owned by one component instance.
- Keep creation lazy: `fromFetch` starts on subscription, but `from(fetch(url))` fetches
  immediately. Wrap eager APIs in `defer(() => fetch(url))`.
- If React Compiler already memoizes the expression, don't add redundant wrappers.

## Server rendering

react-rx hooks belong in Client Components, which still render HTML on the server without
subscribing. The value hooks emit their initial value there, so pick one that matches the client's
first render; the promise hook returns a pending promise, so the child shows its fallback; and
`preloadObservablePromise` does nothing. Subscriptions start on the client after hydration. For data
fetched on the server, use your framework's server-data facilities or pass a server-created promise
for `use()` to read. The [timers and time ago lesson](/examples/sync) includes a live
`hydrateRoot` demo.

## Loading, errors, and retries

Decide what the component should show before reaching for operators. Use an Error Boundary when a
whole section should be replaced; emit a value such as `{status: 'error', data, error}` when the
user should keep seeing results beside a retry button. Put `catchError` and `retry` **inside**
`switchMap` so later events still start requests, and bound every retry with a count and delay. See
[handle observable errors](/examples/errors) and [resilient fetch](/examples/resilient-fetch).

## Choosing between libraries

react-rx is a way to read observables in React, not a reason to move all state into RxJS. Keep local
UI state in `useState`, and reach for a query cache, state container, or state machine where those
fit better. The [comparison](/comparison) weighs react-rx against other RxJS bindings and shows how
it sits alongside tools like TanStack Query, Zustand, Jotai, and XState.

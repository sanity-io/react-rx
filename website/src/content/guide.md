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

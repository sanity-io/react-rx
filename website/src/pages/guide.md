# Getting Started

## Installation

```sh npm2yarn
npm i react-rx rxjs
```

## Observable Hooks

### useObservable()

Use observables in React components with the `useObservable` hook.

If you need to subscribe to an observable in your component, this hook will give you the current value from it

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

The `initialValue` argument is optional. If its omitted, the value returned from `useObservable` may be `null` initially. If the observable emits a value _synchronously_ at subscription time, that value will be used as the initial value, and any `initialValue` passed as argument to `useObservable` will be ignored:

```tsx
import {useMemo} from 'react'
import {useObservable} from 'react-rx'
import {of} from 'rxjs'

// This component will never render "Hello mars!" since the observable emits "world" synchronously.
function MyComponent(props) {
  const observable = useMemo() => of('world'),[])
  const planet = useObservable(observable, 'mars')

  return <>Hello {planet}!</>
}
```

### useObservableEvent()

This creates an event handler that can be used to create an observable from events.

Here's an example of a component that displays the current value from a range input:

```tsx
imprt {useState} from 'react'
import {useObservableEvent} from 'react-rx'
import {filter, map, tap} from 'rxjs/operators'

const ShowSliderValue = () => {
  const [value, setValue] = useState(0)
  const handleChange = useObservableEvent((value$) =>
    value$.pipe(
      // Ignore null values
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
  return v !== null
}
```

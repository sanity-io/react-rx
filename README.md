# ReactRx

:fishing_pole_and_fish: :hammer_and_wrench: Hooks and utilities for working with RxJS and React

# Reactive components

A reactive component is a React component that gets called with an observable of its props and returns an observable of React elements.

This is useful when you have want to make a component that composes different RxJS streams into a single render function.

### `reactiveComponent()`

The `reactiveComponent()` takes as an argument a function component that is very similar to a regular function component in React, with two notable differences:

1. It does not receive a props object, but an Observable of the props instead
2. It does not expect React elements to be returned, but an Observable of react elements (e.g. an observable of the same type as you would otherwise return from your regular component)

- `function reactiveComponent<Props>(component: (props$: Observable<Props>) => Observable<React.ReactNode>): React.FunctionComponent<Props>`

Here's an example:

```js
const Fetch = reactiveComponent(props$ =>
  props$.pipe(
    map(props => props.url),
    distinctUntilChanged(),
    switchMap(url => fetch(url).then(response => response.text())),
    map(responseText => <>Response is {responseText}</>)
  )
)

// Usage
ReactDOM.render(<Fetch url="/some/url)" />, container)
```

Note: values created by other hooks are not automatically updated. In order to respond to changes in a value created by `React.useState` in a reactive component, you need to convert it into an observable by wrapping it in a `stream()` call, e.g:

```js
const [count, setCount] = React.useState(0)
return stream(count).pipe(
  map(currentCount => (
    <>
      <div>Click count: {currentCount}</div>
      <button onClick={() => setCount(currentCount + 1)}>Click!</button>
    </>
  ))
)
```

A better solution is to use `createState()` instead of `React.useState()` (see below).

### `createState()`

This is useful in a reactive component when you want to maintain some state as an observable while also being able to change it during the lifetime of your component.
It is similar to `createEventHandler` only that instead of representing events, it represents a value that starts with an initial value, then changes over time.

Example:

```js
const ClickCounter = reactiveComponent(() => {
  const [count$, setState] = createState(0)
  return count$.pipe(
    scan < number > (count => count + 1),
    map(count => (
      <>
        <div>Click count: {count}</div>
        <button onClick={() => setState(count + 1)}>Click!</button>
      </>
    ))
  )
})
```

### `createEventHandler()`

This is useful in the context of a reactive component that needs to respond to user input or other types of DOM events. It will return an observable that represents the values that the handler gets called with.

- `function createEventHandler<EventType>(): [Observable<EventType>, (event: EventType) => void]`

Example:

```js
const ClickCounter = reactiveComponent(() => {
  const [clicks$, handleClick] = createEventHandler()
  return clicks$.pipe(
    startWith(0),
    scan < number > (count => count + 1),
    map(count => (
      <>
        <div>Click count: {count}</div>
        <button onClick={handleClick}>Click!</button>
      </>
    ))
  )
})
```

## :fishing_pole_and_fish: Hooks

### The `useObservable()` hook

Use observables in React components with the `useObservable` hook

- `function useObservable<T>(observable$: Observable<T>): T | null`
- `function useObservable<T>(observable$: Observable<T>, initialValue: T): T`

If you need to subscribe to an observable in your component, this hook will give you the current value from it

Example:

```jsx
import {interval} from 'rxjs'
import React from 'react'
import {useObservable} from 'reactrx'

function MyComponent(props) {
  const number = useObservable(interval(100), 0)
  return <>The number is {number}</div>
}
```

The `initialValue` argument is optional. If its omitted, the value returned from `useObservable` may be `null` initially. If the observable emits a value _synchronously_ at subscription time, that value will be used as the initial value, and any `initialValue` passed as argument to `useObservable` will be ignored:

```js
import {of} from 'rxjs'
import React from 'react'
import {useObservable} from 'reactrx'

// This component will never render "Hello mars!" since the observable emits "world" synchronously.
function MyComponent(props) {
  const planet = useObservable(of('world'), 'mars')
  return <>Hello {planet}!</>
}
```

### The `useObservableState` hook

If you need to represent some piece of state as an observable and also want the ability to change this state during the lifetime of the component, `useObservableState` is for you. It acts like `React.useState()`, only that it returns an observable representing changes to the value instead of the value itself. The callback/setter returned acts like a the regular callback you would otherwise get from `React.useState`. This is useful when you want to compose the state change together with other observables.

- `function useObservableState<T>(initial: T): [Observable<T>, (next: T) => void]`

Example:

```
function MyComponent(props) {
  const [speed$, setSpeed] = useObservableState(1)

  const count$ = speed$.pipe(
    switchMap(speed => timer(0, 1000 / speed)),
    scan(count => count + 1, 0)
  )

  const currentSpeed = useObservable(speed$)
  const currentCount = useObservable(count$)

  return (
    <div>
      <div>Counter value: {currentCount}</div>
      <div>Counting speed: {Math.round((1 / currentSpeed) * 100) / 100}s</div>
      <input
        type="range"
        value={currentSpeed}
        min={1}
        max={10}
        onChange={event => setSpeed(Number(event.currentTarget.value))}
      />
    </div>
  )
}
```

### The `useEventHandler` hook

This creates an event handler and an observable that represents calls to that handler. This is similar to `createEventHandler`, but wraps it in `React.createMemo` to persist it throughout the lifetime of the component.

- `function useEventHandler<Event>(): [Observable<Event>, (event: Event) => void]`

Example:

```ts
const [onSliderChange$, onSliderChange] = useEventHandler<React.ChangeEvent<HTMLInputElement>>()

const sliderValue = useObservable(
  onSliderChange$.pipe(
    map(event => event.currentTarget.value),
    map(value => Number(value)),
    startWith(1)
  )
)
return (
  <>
    <input type="range" value={sliderValue} min={1} max={10} onChange={onSliderChange} />{' '}
    {sliderValue}
  </>
)
```

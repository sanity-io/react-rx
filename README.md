# ReactRx

:fishing_pole_and_fish: :hammer_and_wrench: Hooks and Utilities for working with RxJS and React

## API
### :fishing_pole_and_fish: `useObservable()`
Use observables in React components with the `useObservable` hook

- `function useObservable<T>(observable$: Observable<T>): T | null`

- `function useObservable<T>(observable$: Observable<T>, initialValue: T): T`

If you need to subscribe to an observable in your component, this hook will give you the current value from it

Example:
```js
import {interval} from 'rxjs'
import React from 'react'
import {useObservable} from 'reactrx'

function MyComponent(props) {
  const number = useObservable(interval(100), 0)
  return <div>The number is {number}</div>
}
```
The `initialValue` is optional. If its omitted, the value returned from `useObservable` may be `null` initially. If the observable emits a value _synchronously_ at subscription time, that value will be used as the initial value, and any `initialValue` passed as argument to `useObservable` will be ignored.

```js
import {of} from 'rxjs'
import React from 'react'
import {useObservable} from 'reactrx'

// This component will never render "Hello mars" since the observable emits "world" synchronously.
function MyComponent(props) {
  const planet = useObservable(of('world'), 'mars')
  return <div>Hello {planet}</div>
}
```

## :hammer_and_wrench: `reactiveComponent()`
You can create reactive components with `reactiveComponent()`

- `function reactiveComponent<Props>(observableComponent: Observable<Props>): React.FunctionComponent<{}>`
- `function reactiveComponent<Props>(observableComponent: Component<Props>): React.FunctionComponent<Props>`


If you want to make a component that composes different RxJS streams into a render function, the `reactiveComponent` can help you.

The `reactiveComponent()` takes as an argument a function component that is very similar to a regular function component in React, with two notable differences:

1) It does not receive a props object, but an Observable of props instead 
2) It does expect React elements to be returned, but an Observable of react elements (e.g. the same as you would otherwise return from your regular component)

Here's an example
```ts
const UpperCase = reactiveComponent(props$ =>
  props$.pipe(
    map(props => props.text.toUpperCase()),
    map(text => <p>{text}</p>)
  )
)

// Usage
ReactDOM.render(<UpperCase text="Hello world!" />, node)
```

### The `useObservableState` hook
If you need to represent some piece of state as an observable and also want the ability to change this state during the lifetime of the component, `useObservableState` is for you. It acts like `React.useState()`, only that it returns an observable representing changes to the value instead of the value itself. The callback/setter returned acts like a the regular callback you would otherwise get from `React.useState`. This is useful when you want to compose the state change together with other observables.
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
This creates an event handler and an observable that represents calls to that handler
```js
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
      <input type="range" value={sliderValue} min={1} max={10} onChange={onSliderChange} /> {sliderValue}
    </>
  )
```

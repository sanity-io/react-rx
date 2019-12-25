## react-rx

_Hooks and utilities for combining React with RxJS_

Features:

- Works well with Observables emitting values synchronously. You don't pay the re-render-on-mount tax.
- Lightweight. Implemented on top of a small React Hook based core.
- Full TypeScript support.

This package offers two slightly different utilities for working with RxJS and React:

- :hammer_and_wrench: The *`reactiveComponent()`* wrapper
- :fishing_pole_and_fish: The *`useObservable()`* hook

Although they share a lot of similarities, and reactiveComponent is built on top of `useObservable` are not intended to be used together inside the same component as they represent two different programming styles.

---

- [Reactive components](#reactive-components)
- [Observable hooks](#use-observable)
- [Code examples](https://github.com/sanity-io/react-rx/tree/master/web/examples)

<a name="reactive-components"></a>

## What's a reactive component anyway?

A _reactive component_ is a React component that turns an observable of props into an observable of [values React can render](https://reactjs.org/docs/react-component.html#render) (e.g. element, strings, fragments)

A _reactive component_ enables you to create components that composes different RxJS streams into a single render function, making your view purely a function of state.

The `reactiveComponent()` utility wraps a function component that is very similar to a regular React function component, with two notable differences:

1. Instead of being called with a _props object_, it is called with an _Observable of props_
2. Instead of returning _renderable values_, it returns an _Observable of renderable values_

Here's an example component that fetches some text from the url passed as the `url` prop:

```jsx
import {reactiveComponent} from 'react-rx'
import {switchMap, map} from 'rxjs'

const Fetch = reactiveComponent(props$ =>
  props$.pipe(
    switchMap(props => fetch(props.url).then(response => response.text())),
    map(responseText => <>Response is {responseText}</>),
  ),
)

// Usage
ReactDOM.render(<Fetch url="/some/url)" />, container)
```

Instead of a _function_, `reactiveComponent` can also take an `Observable` as argument as long as it's an observable of [something React can render](https://reactjs.org/docs/react-component.html#render). This is neat when you have component that doesn't take any props, but still depends on values coming from an `Observable`:

```jsx
import {reactiveComponent} from 'react-rx'

const Counter = reactiveComponent(timer(0, 100).pipe(map(counter => <>The number is {counter}</>)))

// Usage
ReactDOM.render(<Counter />, container)
```

### Using React hooks in a Reactive component

Note: Reactive components will not automatically re render when a value coming from a hook updates, in order achieve that, you need to convert it into an observable. This is done by wrapping it using the `toObservable()` utility before combining it with the returned observable. Here's an example using `React.useState()`:

```jsx
import {reactiveComponent} from 'react-rx

const Counter = reactiveComponent(props$ => {
  const [count, setCount] = React.useState(0)

  return toObservable(count).pipe(
    map(currentCount => (
      <>
        <div>Click count: {currentCount}</div>
        <button onClick={() => setCount(currentCount + 1)}>Click!</button>
      </>
    )))
})
```

The `toObservable` function makes it possible to consume community provided React hooks inside a reactive component. However, this package also export some utility functions that wraps regular hooks so you can use them with less boilerplate, for example, the `useState` function.

### Local component state

Instead of calling `React.useState()` directly, you can also use the `useState` function exported from this package. Instead of the actual state value it will return an observable representing the state changes, along with a function to update it. Here's the example above rewritten to use `useState` from this package instead.

```jsx
import * as ReactRx from 'react-rx'

const Counter = ReactRx.component(() => {
  const [count$, setCount] = ReactRx.useState(0)

  return count$.pipe(
    map(currentCount => (
      <>
        <div>Click count: {currentCount}</div>
        <button onClick={() => setCount(currentCount + 1)}>Click!</button>
      </>
    )),
  )
})
```

### Responding to events

Sometimes your state comes as a function of an event triggered by the user. Let's say you want to display the mouse cursors x,y position as the user moves the mouse inside a component. This can be done py using the `useEvent()` utility:

```js
import * as ReactRx from 'react-rx'

const MouseTracker = ReactRx.component(() => {
  const [mouseMove$, onMouseMove] = useEvent()

  return mouseMove$.pipe(
    map(event => (
      <>
        <div onMouseMove={handleMouseMove}>Hover me!</div>
        <pre>
          x={event.screenX},y={event.screenY}
        </pre>
      </>
    )),
  )
})
```

#### Gotcha: Initial render

The above example will not produce any DOM before a mousemove event has been triggered, and the mouse event can't be triggered before the DOM has been rendered, which puts us in a catch-22 situation. To cope with it, we can make the observable start by emitting an initial value for the event.

We can do this by using the `startWith` operator that comes with RxJS:

```js
import {reactiveComponent, useEvent} from 'react-rx'
import {map, startWith} from 'rxjs/operators'

const MouseTracker = reactiveComponent(() => {
  const [mouseMove$, handleMouseMove] = useEvent()

  return mouseMove$.pipe(
    startWith(null),
    map(event => (
      <>
        <div onMouseMove={handleMouseMove}>Hover me!</div>
        {event && (
          <pre>
            x={event.screenX},y={event.screenY}
          </pre>
        )}
      </>
    )),
  )
})
```

This means the `event` argument now can also be `null` so we also need to guard about that in our render function.

import * as React from 'react'
import {Observable, timer} from 'rxjs'
import {distinctUntilChanged, map, scan, startWith, switchMap} from 'rxjs/operators'
import * as ReactiveComponent from '../../src/reactiveComponent'
import {reactiveComponent, useEvent} from '../../src/reactiveComponent'
import {useObservable, useObservableEvent, useObservableState} from '../../src/useObservable'

const UseObservableState = () => {
  const [speed$, setSpeed] = useObservableState(1)

  const count$ = speed$.pipe(
    switchMap(speed => timer(0, 1000 / speed)),
    scan(count => count + 1, 0),
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

const UseEventHandler = () => {
  const [onSliderChange$, onSliderChange] = useObservableEvent<
    React.ChangeEvent<HTMLInputElement>
  >()

  const sliderValue = useObservable(
    onSliderChange$.pipe(
      map(event => event.currentTarget.value),
      map(value => Number(value)),
      startWith(1),
    ),
  )
  return (
    <>
      <input type="range" value={sliderValue} min={1} max={10} onChange={onSliderChange} />{' '}
      {sliderValue}
    </>
  )
}

const MouseTracker = reactiveComponent(() => {
  const [mouseMove$, handleMouseMove] = useEvent<React.MouseEvent>()
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

const ReactiveComponentWithoutProps = ReactiveComponent.reactiveComponent(
  timer(0, 100).pipe(map(counter => <>The number is {counter}</>)),
)

const UpperCase = ReactiveComponent.reactiveComponent((props$: Observable<{text: string}>) =>
  props$.pipe(
    map(props => props.text.toUpperCase()),
    map(text => <p>{text}</p>),
  ),
)

const ClickCounterUseState = ReactiveComponent.reactiveComponent(() => {
  const [count, setCount] = React.useState(0)
  return ReactiveComponent.toObservable(count).pipe(
    map(currentCount => (
      <>
        <div>Click count: {currentCount}</div>
        <button onClick={() => setCount(currentCount + 1)}>Click!</button>
      </>
    )),
  )
})

const ClickCounter = ReactiveComponent.reactiveComponent(() => {
  const [count$, setState] = ReactiveComponent.useState(0)
  return count$.pipe(
    scan<number>(count => count + 1),
    map(count => (
      <>
        <div>Click count: {count}</div>
        <button onClick={() => setState(count + 1)}>Click!</button>
      </>
    )),
  )
})

const Fetch = ReactiveComponent.reactiveComponent<{url: string}>(props$ =>
  props$.pipe(
    map(props => props.url),
    distinctUntilChanged(),
    switchMap(url => fetch(url).then(response => response.text())),
    map(responseText => <p>{responseText}</p>),
  ),
)

export const ReadmeExamples = () => {
  return (
    <>
      <h2>useObservableState</h2>
      <UseObservableState />
      <h2>useEventHandler</h2>
      <MouseTracker />
      <UseEventHandler />
      <h2>ReactiveComponentWithoutProps</h2>
      <ReactiveComponentWithoutProps />
      <h2>UpperCase</h2>
      <UpperCase text="Hello world!" />
      <h2>ClickCounter</h2>
      <ClickCounter />
      <h2>ClickCounter with useState</h2>
      <ClickCounterUseState />
    </>
  )
}

import * as React from 'react'
import {Observable, timer} from 'rxjs'
import {map, scan, switchMap, startWith} from 'rxjs/operators'
import {reactiveComponent, useEventHandler, useObservable, useObservableState} from '../../'

const UseObservableState = () => {
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

const UseEventHandler = () => {
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
}

const ReactiveComponentWithoutProps = reactiveComponent(
  timer(0, 100).pipe(map(counter => <>The number is {counter}</>))
)

const UpperCase = reactiveComponent((props$: Observable<{text: string}>) =>
  props$.pipe(
    map(props => props.text.toUpperCase()),
    map(text => <p>{text}</p>)
  )
)

export const ReadmeExamples = () => {
  return (
    <>
      <h2>useObservableState</h2>
      <UseObservableState />
      <h2>useEventHandler</h2>
      <UseEventHandler />
      <h2>ReactiveComponentWithoutProps</h2>
      <ReactiveComponentWithoutProps />
      <h2>UpperCase</h2>
      <UpperCase text="Hello world!" />
    </>
  )
}

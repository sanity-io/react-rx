import {useMemo, useState} from 'react'
import {useObservable} from 'react-rx'
import {timer} from 'rxjs'
import {
  map,
  startWith,
} from 'rxjs/operators'

export default function App() {
  const [delay, setDelay] =
    useState(100)
  const observable = useMemo(
    () =>
      timer(500, delay).pipe(
        map((n) => `Count: ${n}`),
        startWith('Starting counter…'),
      ),
    [delay],
  )

  const label =
    useObservable(observable)
  return (
    <>
      Counter interval (ms):{' '}
      <input
        type="range"
        min={0}
        max={1000}
        step={100}
        onChange={(e) =>
          setDelay(
            Number(
              e.currentTarget.value,
            ),
          )
        }
      />
      {delay}
      <div>{label}</div>
    </>
  )
}

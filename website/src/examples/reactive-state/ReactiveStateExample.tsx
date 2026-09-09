import {useMemo, useState} from 'react'
import {useObservable} from 'react-rx'
import {map, timer} from 'rxjs'

export default function App() {
  const [delay, setDelay] = useState(500)
  const observable = useMemo(
    () =>
      timer(500, delay).pipe(
        map((n) => `Count: ${n}`),
      ),
    [delay],
  )

  const label = useObservable(
    observable,
    'Starting counter…',
  )
  return (
    <>
      Counter interval (ms):{' '}
      <input
        type="range"
        min={0}
        max={1000}
        step={100}
        value={delay}
        onChange={(e) =>
          setDelay(Number(e.currentTarget.value))
        }
      />
      {delay}
      <div>{label}</div>
    </>
  )
}

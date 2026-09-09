import {useMemo, useState} from 'react'
import {
  useObservable,
  useSyncObservable,
} from 'react-rx'
import {
  combineLatest,
  interval,
  NEVER,
  scan,
  switchMap,
} from 'rxjs'
import {BehaviorSubject} from 'rxjs'

// The same demo as streams. There is nothing to get subtly wrong: the delay
// and the running flag are inputs to the stream, switchMap swaps the interval
// whenever either changes, and scan keeps the count across swaps.
export default function App() {
  const [delay$] = useState(
    () => new BehaviorSubject(1000),
  )
  const [running$] = useState(
    () => new BehaviorSubject(true),
  )

  const count$ = useMemo(
    () =>
      combineLatest([delay$, running$]).pipe(
        switchMap(([delay, running]) =>
          running ? interval(delay) : NEVER,
        ),
        scan((count) => count + 1, 0),
      ),
    [delay$, running$],
  )

  const count = useObservable(count$, 0)
  const delay = useSyncObservable(
    delay$,
    delay$.getValue(),
  )
  const running = useSyncObservable(
    running$,
    running$.getValue(),
  )

  return (
    <>
      <h4>{count}</h4>
      <label>
        Delay: {delay}ms
        <input
          type="range"
          min={100}
          max={2000}
          step={100}
          value={delay}
          onChange={(e) =>
            delay$.next(
              Number(e.currentTarget.value),
            )
          }
        />
      </label>
      <label>
        <input
          type="checkbox"
          checked={running}
          onChange={(e) =>
            running$.next(e.currentTarget.checked)
          }
        />
        Running
      </label>
    </>
  )
}

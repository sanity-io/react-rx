import {useMemo, useState} from 'react'
import {
  useObservable,
  useSyncObservable,
} from 'react-rx'
import {
  BehaviorSubject,
  combineLatest,
  EMPTY,
  interval,
  scan,
  startWith,
  switchMap,
} from 'rxjs'

// react-rx: two stable subjects hold the controls, one stream holds the logic.
export function RxTimer() {
  const [{running$, delay$}] = useState(() => ({
    running$: new BehaviorSubject(false),
    delay$: new BehaviorSubject(1000),
  }))

  const count$ = useMemo(
    () =>
      combineLatest([running$, delay$]).pipe(
        // Pausing swaps in EMPTY; resuming swaps in a fresh interval. switchMap
        // disposes the previous timer, and scan below keeps the running total.
        switchMap(([running, delay]) =>
          running ? interval(delay) : EMPTY,
        ),
        scan((total) => total + 1, 0),
        startWith(0),
      ),
    [running$, delay$],
  )

  // Controls read synchronously; the tick display can defer.
  const running = useSyncObservable(
    running$,
    false,
  )
  const delay = useSyncObservable(delay$, 1000)
  const count = useObservable(count$, 0)

  return (
    <fieldset>
      <legend>RxJS switchMap + scan</legend>
      <p>Ticks: {count}</p>
      <p>
        <button
          type="button"
          onClick={() => running$.next(!running)}
        >
          {running ? 'Pause' : 'Start'}
        </button>
      </p>
      <p>
        <label>
          Interval: {delay}ms{' '}
          <input
            type="range"
            min={200}
            max={2000}
            step={200}
            value={delay}
            onChange={(event) =>
              delay$.next(
                Number(event.currentTarget.value),
              )
            }
          />
        </label>
      </p>
    </fieldset>
  )
}

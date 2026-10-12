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
  type Observable,
  scan,
  startWith,
  switchMap,
} from 'rxjs'

// Built outside render: pausing swaps in EMPTY; resuming swaps in a fresh
// interval. switchMap disposes the previous timer, and scan keeps the running
// total across every pause and interval change.
export function createCount$(
  running$: Observable<boolean>,
  delay$: Observable<number>,
): Observable<number> {
  return combineLatest([running$, delay$]).pipe(
    switchMap(([running, delay]) =>
      running ? interval(delay) : EMPTY,
    ),
    scan((total) => total + 1, 0),
    startWith(0),
  )
}

// react-rx: two stable subjects hold the controls, one stream holds the logic.
export function RxTimer() {
  const [{running$, delay$}] = useState(() => ({
    running$: new BehaviorSubject(false),
    delay$: new BehaviorSubject(1000),
  }))

  const count$ = useMemo(
    () => createCount$(running$, delay$),
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

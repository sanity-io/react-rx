import {useMemo} from 'react'
import {useObservable} from 'react-rx'
import {
  map,
  type Observable,
  scan,
  timer,
} from 'rxjs'

// Captured once, when this module first loads. This stands in for "the moment
// the server rendered the page".
const serverTime = new Date()

function formatClock(date: Date): string {
  return date.toLocaleTimeString('en-GB', {
    hour12: false,
  })
}

interface ClockState {
  time: string
  iso: string
  ticks: number
}

// Shared between the server render and the client hydration, so the first paint
// is byte-for-byte identical on both sides — including the dateTime attribute.
const initialState: ClockState = {
  time: formatClock(serverTime),
  iso: serverTime.toISOString(),
  ticks: 0,
}

// Built outside render: a cold stream that reads the wall clock only once
// subscribed (on commit), never during rendering.
function createClock$(): Observable<ClockState> {
  return timer(1000, 1000).pipe(
    map(() => new Date()),
    scan(
      (state, now) => ({
        time: formatClock(now),
        iso: now.toISOString(),
        ticks: state.ticks + 1,
      }),
      initialState,
    ),
  )
}

export function LiveClock() {
  const state$ = useMemo(() => createClock$(), [])

  // The observable is never subscribed during render, so the server and the
  // client's first render both paint initialState — no hydration mismatch.
  const {time, iso, ticks} = useObservable(
    state$,
    initialState,
  )

  return (
    <time dateTime={iso}>
      {time} (ticks: {ticks})
    </time>
  )
}

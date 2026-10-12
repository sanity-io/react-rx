import {useMemo} from 'react'
import {useObservable} from 'react-rx'
import {
  distinctUntilChanged,
  map,
  type Observable,
  scan,
  timer,
} from 'rxjs'

import {
  type Elapsed,
  selectUnit,
} from './selectUnit'

interface Snapshot extends Elapsed {
  /** How many values reached React — not how many times the timer ticked. */
  emissions: number
}

const initialSnapshot: Snapshot = {
  unit: 'second',
  value: 0,
  emissions: 0,
}

// Built outside render: the wall clock is read only inside the pipeline, which
// runs on subscribe (commit), never during rendering.
function createSnapshot$(
  date: Date,
): Observable<Snapshot> {
  return timer(0, 1000).pipe(
    map(() =>
      selectUnit(Date.now() - date.getTime()),
    ),
    // The timer ticks every second, but only a changed {unit, value} survives
    // this filter, so React re-renders only when the label changes.
    distinctUntilChanged(
      (a, b) =>
        a.unit === b.unit && a.value === b.value,
    ),
    scan<Elapsed, Snapshot>(
      (previous, next) => ({
        ...next,
        emissions: previous.emissions + 1,
      }),
      initialSnapshot,
    ),
  )
}

export function TimeAgo({
  date,
  locale,
}: {
  date: Date
  locale: string
}) {
  const snapshot$ = useMemo(
    () => createSnapshot$(date),
    [date],
  )
  const rtf = useMemo(
    () =>
      new Intl.RelativeTimeFormat(locale, {
        numeric: 'auto',
      }),
    [locale],
  )

  const {unit, value, emissions} = useObservable(
    snapshot$,
    initialSnapshot,
  )

  return (
    <li>
      <time dateTime={date.toISOString()}>
        {rtf.format(-value, unit)}
      </time>{' '}
      <small>({emissions} emissions)</small>
    </li>
  )
}

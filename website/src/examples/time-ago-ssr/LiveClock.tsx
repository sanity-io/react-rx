import {useEffect, useMemo} from 'react'
import {useObservable} from 'react-rx'
import {
  distinctUntilChanged,
  map,
  timer,
} from 'rxjs'

import {
  type Elapsed,
  selectUnit,
} from '../time-ago/selectUnit'

export interface ServerSnapshot {
  publishedAt: number
  initial: Elapsed
  locale: string
}

function elapsedSince$(publishedAt: number) {
  return timer(0, 1000).pipe(
    map(() =>
      selectUnit(Date.now() - publishedAt),
    ),
    distinctUntilChanged(
      (previous, next) =>
        previous.unit === next.unit &&
        previous.value === next.value,
    ),
  )
}

export function LiveClock({
  snapshot,
  onHydrated,
}: {
  snapshot: ServerSnapshot
  onHydrated?: () => void
}) {
  const elapsed$ = useMemo(
    () => elapsedSince$(snapshot.publishedAt),
    [snapshot.publishedAt],
  )
  const {unit, value} = useObservable(
    elapsed$,
    snapshot.initial,
  )
  const formatter = useMemo(
    () =>
      new Intl.RelativeTimeFormat(
        snapshot.locale,
        {numeric: 'always'},
      ),
    [snapshot.locale],
  )

  useEffect(() => onHydrated?.(), [onHydrated])

  return (
    <time
      dateTime={new Date(
        snapshot.publishedAt,
      ).toISOString()}
    >
      {formatter.format(-value, unit)}
    </time>
  )
}

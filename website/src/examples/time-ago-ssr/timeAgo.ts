import {
  distinctUntilChanged,
  map,
  type Observable,
  share,
  timer,
} from 'rxjs'

// The observable emits *data* (a value + unit pair ready for
// Intl.RelativeTimeFormat) — how it reads on screen is the component's job.
export interface TimeAgoParts {
  value: number
  unit: 'second' | 'minute' | 'hour' | 'day'
}

export function toTimeAgoParts(
  elapsedMs: number,
): TimeAgoParts {
  const seconds = Math.max(
    0,
    Math.floor(elapsedMs / 1000),
  )
  if (seconds < 60)
    return {value: -seconds, unit: 'second'}
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60)
    return {value: -minutes, unit: 'minute'}
  const hours = Math.floor(minutes / 60)
  if (hours < 24)
    return {value: -hours, unit: 'hour'}
  return {
    value: -Math.floor(hours / 24),
    unit: 'day',
  }
}

// One shared clock for every label on the page. Plain share() — no replay:
// a replay buffer would hand a *stale* tick to the next subscriber after the
// last one leaves, which breaks the deterministic first render (and, in the
// SSR demo, hydration). New subscribers use the hook's initialValue until the
// next real tick instead.
const now$ = timer(0, 1000).pipe(
  map(() => Date.now()),
  share(),
)

const cache = new Map<
  number,
  Observable<TimeAgoParts>
>()

/**
 * The clock ticks every second, but distinctUntilChanged only lets a value
 * through when the *rendered* parts actually change: every second while the
 * label reads seconds, then once a minute, then once an hour. React never
 * re-renders for a tick that wouldn't change the text.
 */
export function timeAgoParts$(
  sentAt: number,
): Observable<TimeAgoParts> {
  let parts$ = cache.get(sentAt)
  if (!parts$) {
    parts$ = now$.pipe(
      map((now) => toTimeAgoParts(now - sentAt)),
      distinctUntilChanged(
        (a, b) =>
          a.value === b.value &&
          a.unit === b.unit,
      ),
    )
    cache.set(sentAt, parts$)
  }
  return parts$
}

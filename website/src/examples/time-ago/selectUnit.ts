export type Unit =
  | 'second'
  | 'minute'
  | 'hour'
  | 'day'

export interface Elapsed {
  unit: Unit
  /** Whole units elapsed, as a positive magnitude. */
  value: number
}

/**
 * Pick the coarsest sensible unit for an elapsed duration and the whole number
 * of those units. Returning a numeric {unit, value} — rather than a formatted
 * string — is what lets `distinctUntilChanged` collapse every tick that would
 * render the same thing.
 */
export function selectUnit(
  elapsedMs: number,
): Elapsed {
  const seconds = Math.floor(elapsedMs / 1000)
  if (seconds < 60) {
    return {unit: 'second', value: seconds}
  }
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) {
    return {unit: 'minute', value: minutes}
  }
  const hours = Math.floor(minutes / 60)
  if (hours < 24) {
    return {unit: 'hour', value: hours}
  }
  return {
    unit: 'day',
    value: Math.floor(hours / 24),
  }
}

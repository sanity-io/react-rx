import {map, type Observable, timer} from 'rxjs'

const LATENCY_MS = 1000

const cache = new Map<
  string,
  Observable<{tab: string; body: string}>
>()

/** Cold fetch-like source with visible artificial latency. Stable per tab id. */
export function fetchTab$(
  tab: string,
): Observable<{tab: string; body: string}> {
  let observable = cache.get(tab)
  if (!observable) {
    observable = timer(LATENCY_MS).pipe(
      map(() => ({
        tab,
        body: `Content for “${tab}” loaded after ${LATENCY_MS}ms`,
      })),
    )
    cache.set(tab, observable)
  }
  return observable
}

import {
  BehaviorSubject,
  defer,
  map,
  timer,
  type Observable,
} from 'rxjs'

export interface Snapshot {
  price: number
  at: number
}

/**
 * ─── MOCK ────────────────────────────────────────────────────────────────
 * A flaky price API: requests take ~400ms and roughly a third of them fail.
 * Stand-in for `fromFetch(...)` against a real endpoint. Everything outside
 * this mock is what your own code would look like.
 */
let lastPrice = 100
export function fetchPrice(): Observable<Snapshot> {
  return defer(() =>
    timer(400).pipe(
      map(() => {
        if (Math.random() < 0.35) {
          throw new Error(
            '503 Service Unavailable',
          )
        }
        lastPrice =
          Math.round(
            (lastPrice +
              (Math.random() - 0.5) * 4) *
              100,
          ) / 100
        return {price: lastPrice, at: Date.now()}
      }),
    ),
  )
}

/**
 * Simulated connectivity, so the demo is testable with a button. In a real
 * app, derive it from the browser instead:
 *
 *   const online$ = merge(
 *     fromEvent(window, 'online').pipe(map(() => true)),
 *     fromEvent(window, 'offline').pipe(map(() => false)),
 *   ).pipe(startWith(navigator.onLine))
 */
export const online$ = new BehaviorSubject(true)

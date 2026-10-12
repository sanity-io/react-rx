import {
  catchError,
  concat,
  defer,
  EMPTY,
  EmptyError,
  firstValueFrom,
  map,
  type Observable,
  of,
  tap,
  throwError,
  timer,
} from 'rxjs'
import {afterEach, beforeEach, expect, test, vi} from 'vitest'

import {createObservableCache} from '../createObservableCache'

const TTL = 5000
const LATENCY = 10

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

/** A source that completes, like the requests the cache is built for. */
function trackedFetch() {
  let calls = 0
  const fetch = (key: string) => {
    calls++
    return timer(LATENCY).pipe(map(() => `${key}#${calls}`))
  }
  return {fetch, calls: () => calls}
}

/** Subscribe, then let the fake clock run: a cold source starts on subscribe. */
async function read<T>(source: Observable<T>, latency = LATENCY): Promise<T> {
  const value = firstValueFrom(source)
  await vi.advanceTimersByTimeAsync(latency)
  return value
}

test('returns the same observable for the same key', () => {
  const cache = createObservableCache((key: string) => timer(LATENCY).pipe(map(() => key)), {
    ttl: TTL,
  })

  expect(cache('a')).toBe(cache('a'))
  expect(cache('a')).not.toBe(cache('b'))
})

test('dedupes concurrent subscribers into one request', async () => {
  const {fetch, calls} = trackedFetch()
  const cache = createObservableCache(fetch, {ttl: TTL})
  const a$ = cache('a')

  const first = firstValueFrom(a$)
  const second = firstValueFrom(a$)
  await vi.advanceTimersByTimeAsync(LATENCY)

  expect(await first).toBe('a#1')
  expect(await second).toBe('a#1')
  expect(calls()).toBe(1)
})

test('stays open after the result, so a subscriber keeps the key', async () => {
  const {fetch} = trackedFetch()
  const cache = createObservableCache(fetch, {ttl: TTL})
  let completed = false

  const subscription = cache('a').subscribe({
    complete: () => {
      completed = true
    },
  })
  await vi.advanceTimersByTimeAsync(LATENCY)

  expect(completed).toBe(false)
  subscription.unsubscribe()
})

test('keeps the result while anything subscribes, past the ttl', async () => {
  const {fetch, calls} = trackedFetch()
  const cache = createObservableCache(fetch, {ttl: TTL})
  const a$ = cache('a')
  const subscription = a$.subscribe()

  await vi.advanceTimersByTimeAsync(LATENCY + 10 * TTL)

  expect(cache('a')).toBe(a$)
  expect(await firstValueFrom(a$)).toBe('a#1')
  expect(calls()).toBe(1)
  subscription.unsubscribe()
})

test('replays the result until the ttl after its last subscriber left, then refetches', async () => {
  const {fetch, calls} = trackedFetch()
  const cache = createObservableCache(fetch, {ttl: TTL})
  const a$ = cache('a')

  expect(await read(a$)).toBe('a#1')
  await vi.advanceTimersByTimeAsync(TTL - 1)

  // Subscribing again within the ttl replays the result, and leaving restarts the ttl
  expect(await firstValueFrom(a$)).toBe('a#1')
  await vi.advanceTimersByTimeAsync(TTL - 1)
  expect(cache('a')).toBe(a$)
  expect(calls()).toBe(1)

  await vi.advanceTimersByTimeAsync(1)

  expect(cache('a')).not.toBe(a$)
  expect(await read(cache('a'))).toBe('a#2')
  expect(calls()).toBe(2)
})

test('finishes a request that lost every subscriber and replays it within the ttl', async () => {
  const {fetch, calls} = trackedFetch()
  const cache = createObservableCache(fetch, {ttl: TTL})

  cache('a').subscribe().unsubscribe()
  await vi.advanceTimersByTimeAsync(LATENCY)

  expect(await read(cache('a'))).toBe('a#1')
  expect(calls()).toBe(1)
})

test('drops a request that lost every subscriber for longer than the ttl', async () => {
  let requests = 0
  const cache = createObservableCache(
    (key: string) =>
      defer(() => {
        requests++
        return timer(10 * TTL).pipe(map(() => `${key}#${requests}`))
      }),
    {ttl: TTL},
  )
  const abandoned$ = cache('a')

  abandoned$.subscribe().unsubscribe()
  await vi.advanceTimersByTimeAsync(TTL)

  // The grace ran out before the request finished, so it was torn down along with its key
  expect(requests).toBe(1)
  expect(cache('a')).not.toBe(abandoned$)
  expect(await read(cache('a'), 10 * TTL)).toBe('a#2')
})

test('a late release of an orphaned entry does not drop its successor', async () => {
  const {fetch} = trackedFetch()
  const cache = createObservableCache(fetch, {ttl: TTL})

  // Released by the idle timer and then re-created, so one key has two observables
  const orphan$ = cache('a')
  await vi.advanceTimersByTimeAsync(TTL)
  const current$ = cache('a')
  const subscription = current$.subscribe()

  // Subscribing and leaving the orphan runs its release while the successor is the cached entry
  orphan$.subscribe().unsubscribe()
  await vi.advanceTimersByTimeAsync(LATENCY + TTL)

  expect(cache('a')).toBe(current$)
  subscription.unsubscribe()
})

test('clear() forgets every key, so the next caller refetches', async () => {
  const {fetch, calls} = trackedFetch()
  const cache = createObservableCache(fetch, {ttl: TTL})
  const a$ = cache('a')
  const kept = a$.subscribe()

  expect(await read(a$)).toBe('a#1')
  cache.clear()

  // Live subscribers keep what they have; a cleared key's own release is a no-op
  expect(await firstValueFrom(a$)).toBe('a#1')
  expect(cache('a')).not.toBe(a$)
  expect(await read(cache('a'))).toBe('a#2')
  expect(calls()).toBe(2)
  kept.unsubscribe()
})

test('clear() leaves nothing pending for the keys nothing subscribes to', async () => {
  let cancelled = 0
  const cache = createObservableCache(
    (key: string) =>
      timer(10 * TTL).pipe(
        map(() => key),
        tap({
          unsubscribe: () => {
            cancelled++
          },
        }),
      ),
    {ttl: TTL},
  )

  cache('never-subscribed')
  cache('abandoned').subscribe().unsubscribe()
  expect(vi.getTimerCount()).toBeGreaterThan(0)

  cache.clear()

  // The abandoned request is torn down instead of waiting out its grace, and no timer is left to
  // keep a Node process alive
  expect(cancelled).toBe(1)
  expect(vi.getTimerCount()).toBe(0)
})

test('clear() leaves nothing pending for a key whose subscribers have yet to leave', async () => {
  const {fetch} = trackedFetch()
  const cache = createObservableCache(fetch, {ttl: TTL})
  const live = cache('a').subscribe()
  await vi.advanceTimersByTimeAsync(LATENCY)

  cache.clear()

  // Clearing can't disturb a live subscriber, so the grace it would otherwise wait out has to end
  // when it leaves — nothing can rejoin a cleared key
  live.unsubscribe()
  expect(vi.getTimerCount()).toBe(0)
})

test('a failed key leaves no grace behind either', async () => {
  const cache = createObservableCache(() => throwError(() => new Error('down')), {ttl: TTL})

  await expect(firstValueFrom(cache('a'))).rejects.toThrow('down')

  expect(vi.getTimerCount()).toBe(0)
})

test('releases an entry nothing subscribed to once the ttl has elapsed', async () => {
  const {fetch, calls} = trackedFetch()
  const cache = createObservableCache(fetch, {ttl: TTL})
  const unsubscribed$ = cache('a')

  await vi.advanceTimersByTimeAsync(TTL - 1)
  expect(cache('a')).toBe(unsubscribed$)

  await vi.advanceTimersByTimeAsync(1)
  expect(cache('a')).not.toBe(unsubscribed$)
  expect(calls()).toBe(0)
})

test('never caches a failure', async () => {
  let attempts = 0
  const cache = createObservableCache(
    () => {
      attempts++
      return throwError(() => new Error('the endpoint is down'))
    },
    {ttl: TTL},
  )

  const failed$ = cache('a')
  await expect(firstValueFrom(failed$)).rejects.toThrow('the endpoint is down')

  // The key is released as the failed connection tears down, which happens before the rejection is
  // observed, so a retry gets a different observable
  expect(cache('a')).not.toBe(failed$)
  await expect(firstValueFrom(cache('a'))).rejects.toThrow('the endpoint is down')
  expect(attempts).toBe(2)
})

test('an error handler that reads the cache again shares one retry with later callers', async () => {
  let attempts = 0
  const cache = createObservableCache(
    (key: string) =>
      defer(() => {
        const attempt = ++attempts
        return attempt === 1
          ? throwError(() => new Error('the endpoint is down'))
          : timer(LATENCY).pipe(map(() => `${key}#${attempt}`))
      }),
    {ttl: TTL},
  )

  // The handler runs while the failed connection is still tearing down, so it has to be given the
  // fresh entry — handed the failed one, its retry would be orphaned by that teardown
  const retried = firstValueFrom(cache('a').pipe(catchError(() => cache('a'))))
  const later = firstValueFrom(cache('a'))
  await vi.advanceTimersByTimeAsync(LATENCY)

  expect(await retried).toBe('a#2')
  expect(await later).toBe('a#2')
  expect(attempts).toBe(2)
})

test('keeps its key when the request fails after its result', async () => {
  let attempts = 0
  const cache = createObservableCache(
    (key: string) =>
      defer(() => {
        const attempt = ++attempts
        return concat(
          of(`${key}#${attempt}`),
          throwError(() => new Error('the stream dropped')),
        )
      }),
    {ttl: TTL},
  )
  const a$ = cache('a')
  const subscription = a$.subscribe()

  // Releasing here would drop the key while subscribers still hold the result, and each of them
  // refetches on re-render — the request is ended at its result instead
  expect(cache('a')).toBe(a$)
  expect(await firstValueFrom(a$)).toBe('a#1')
  expect(attempts).toBe(1)
  subscription.unsubscribe()
})

test('errors on a request that completes without a value instead of staying pending', async () => {
  let attempts = 0
  const cache = createObservableCache(
    () => {
      attempts++
      return EMPTY
    },
    {ttl: TTL},
  )

  // Holding an empty completion open would leave `use()` suspended forever, so it is a failure:
  // the same `EmptyError` `firstValueFrom` and `useObservablePromise` give an empty source
  const empty$ = cache('a')
  await expect(firstValueFrom(empty$)).rejects.toThrow(EmptyError)

  expect(cache('a')).not.toBe(empty$)
  await expect(firstValueFrom(cache('a'))).rejects.toThrow(EmptyError)
  expect(attempts).toBe(2)
})

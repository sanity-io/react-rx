import {firstValueFrom, map, throwError, timer, type Observable} from 'rxjs'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import {createObservableCache} from './cache'

const TTL = 5000
const LATENCY = 10

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

/** A source that completes, like the fetches the store is built for. */
function trackedFetch() {
  let calls = 0
  const fetch = (id: string) => {
    calls++
    return timer(LATENCY).pipe(map(() => `${id}#${calls}`))
  }
  return {fetch, calls: () => calls}
}

/** Subscribe, then let the fake clock run: a cold source starts on subscribe. */
async function read<T>(source: Observable<T>): Promise<T> {
  const value = firstValueFrom(source)
  await vi.advanceTimersByTimeAsync(LATENCY)
  return value
}

it('returns the same observable for the same arguments', () => {
  const cache = createObservableCache((id: string) => timer(LATENCY).pipe(map(() => id)), {
    ttl: TTL,
  })

  expect(cache('a')).toBe(cache('a'))
  expect(cache('a')).not.toBe(cache('b'))
})

it('dedupes concurrent subscribers into one request', async () => {
  const {fetch, calls} = trackedFetch()
  const cache = createObservableCache(fetch, {ttl: TTL})
  const lessons$ = cache('all')

  const first = firstValueFrom(lessons$)
  const second = firstValueFrom(lessons$)
  await vi.advanceTimersByTimeAsync(LATENCY)

  expect(await first).toBe('all#1')
  expect(await second).toBe('all#1')
  expect(calls()).toBe(1)
})

it('replays the result to later subscribers within the ttl', async () => {
  const {fetch, calls} = trackedFetch()
  const cache = createObservableCache(fetch, {ttl: TTL})

  expect(await read(cache('all'))).toBe('all#1')
  await vi.advanceTimersByTimeAsync(TTL - LATENCY - 1)

  expect(await read(cache('all'))).toBe('all#1')
  expect(calls()).toBe(1)
})

it('completes a request that lost every subscriber, then replays it', async () => {
  const {fetch, calls} = trackedFetch()
  const cache = createObservableCache(fetch, {ttl: TTL})

  cache('all').subscribe().unsubscribe()
  await vi.advanceTimersByTimeAsync(LATENCY)

  expect(await read(cache('all'))).toBe('all#1')
  expect(calls()).toBe(1)
})

it('refetches once the ttl has elapsed', async () => {
  const {fetch, calls} = trackedFetch()
  const cache = createObservableCache(fetch, {ttl: TTL})

  expect(await read(cache('all'))).toBe('all#1')
  await vi.advanceTimersByTimeAsync(TTL)

  expect(await read(cache('all'))).toBe('all#2')
  expect(calls()).toBe(2)
})

it('never caches a failure', async () => {
  let attempts = 0
  const cache = createObservableCache(
    () => {
      attempts++
      return throwError(() => new Error('lessons endpoint is down'))
    },
    {ttl: TTL},
  )

  await expect(firstValueFrom(cache())).rejects.toThrow('lessons endpoint is down')
  await expect(firstValueFrom(cache())).rejects.toThrow('lessons endpoint is down')
  expect(attempts).toBe(2)
})

it('refetches after clear(), which is what revalidate() relies on', async () => {
  const {fetch, calls} = trackedFetch()
  const cache = createObservableCache(fetch, {ttl: TTL})

  expect(await read(cache('all'))).toBe('all#1')
  cache.clear()

  expect(await read(cache('all'))).toBe('all#2')
  expect(calls()).toBe(2)
})

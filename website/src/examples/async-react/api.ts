import {preloadObservablePromise} from 'react-rx'
import {
  BehaviorSubject,
  defer,
  filter,
  finalize,
  firstValueFrom,
  from,
  type Observable,
  scan,
  shareReplay,
  startWith,
  Subject,
  switchMap,
  tap,
} from 'rxjs'

import * as server from './server'
import type {Lesson} from './server'

/**
 * The client data layer as streams. Compared to the original demo's
 * cache-of-promises, the streams keep the same suspense-by-default reads
 * (via useObservablePromise + use()) and add one thing for free: after a
 * revalidation, every visible list updates *in place*. Later emissions
 * never re-trigger a Suspense fallback.
 */

// ── Network debugging: per-endpoint delays and a live request log ────────
export type Endpoint =
  | '/lessons'
  | '/lesson/:id/toggle'
  | '/login'

export const delays: Record<
  Endpoint,
  BehaviorSubject<number>
> = {
  '/lessons': new BehaviorSubject(0),
  '/lesson/:id/toggle': new BehaviorSubject(0),
  '/login': new BehaviorSubject(0),
}

export interface NetRequest {
  id: number
  label: string
  delay: number
  done: boolean
}

let nextRequestId = 1
const requestEvents$ = new Subject<NetRequest>()

/** The last few requests, newest last. One stream drives the debugger UI. */
export const requests$: Observable<NetRequest[]> =
  requestEvents$.pipe(
    scan(
      (all: NetRequest[], event) =>
        [
          ...all.filter((r) => r.id !== event.id),
          event,
        ].slice(-5),
      [],
    ),
    startWith([] as NetRequest[]),
    shareReplay({bufferSize: 1, refCount: false}),
  )

/** Wrap an endpoint call: apply the configured delay and log it. */
function request<T>(
  endpoint: Endpoint,
  label: string,
  call: (delay: number) => Promise<T>,
) {
  return defer(() => {
    const delay = delays[endpoint].getValue()
    const entry: NetRequest = {
      id: nextRequestId++,
      label,
      delay,
      done: false,
    }
    requestEvents$.next(entry)
    return from(call(delay)).pipe(
      finalize(() =>
        requestEvents$.next({
          ...entry,
          done: true,
        }),
      ),
    )
  })
}

// ── Lessons: suspense-by-default reads with in-place revalidation ────────
const revalidate$ = new Subject<void>()
const settled$ = new Subject<string>()
const lessonsCache = new Map<
  string,
  Observable<Lesson[]>
>()

export function lessons$(
  tab: string,
  search: string,
): Observable<Lesson[]> {
  const key = `${tab}:${search}`
  let stream = lessonsCache.get(key)
  if (!stream) {
    stream = revalidate$.pipe(
      startWith(undefined),
      switchMap(() =>
        request(
          '/lessons',
          `GET /lessons?tab=${tab}&q=${search}`,
          (delay) =>
            server.getLessons(tab, search, delay),
        ),
      ),
      tap(() => settled$.next(key)),
      // Intentional stale-while-revalidate: returning to a key replays the
      // last result immediately (no fallback), while startWith + switchMap
      // fetch a fresh copy that streams in place.
      shareReplay({
        bufferSize: 1,
        refCount: true,
      }),
    )
    lessonsCache.set(key, stream)
  }
  return stream
}

/**
 * Refetch all live lesson streams, resolving when the given key has fresh
 * data, so actions can await it and their pending state covers the
 * mutation *and* the refetch, exactly like router.refresh() in the original.
 */
export function revalidateLessons(
  tab: string,
  search: string,
): Promise<unknown> {
  const key = `${tab}:${search}`
  const settled = firstValueFrom(
    settled$.pipe(filter((k) => k === key)),
  )
  revalidate$.next()
  return settled
}

// ── Mutations: one-shot promise interop for use inside Actions ───────────
export function toggleLesson(
  id: string,
): Promise<void> {
  return firstValueFrom(
    request(
      '/lesson/:id/toggle',
      `POST /lesson/${id}/toggle`,
      (delay) => server.postToggle(id, delay),
    ),
  )
}

export function login(): Promise<void> {
  return firstValueFrom(
    request('/login', 'POST /login', (delay) =>
      server.postLogin(delay),
    ),
  )
}

/**
 * Warm the lessons cache before navigating, but wait at most one second:
 * on a fast network login completes straight into the full list, on a slow
 * one it navigates after 1s and lets the Suspense fallback take over.
 * preloadObservablePromise starts the fetch and returns the same promise
 * the Home screen's useObservablePromise will read.
 */
export function prefetchLessons(): Promise<unknown> {
  return Promise.race([
    preloadObservablePromise(
      lessons$('all', ''),
      {ttl: 10_000},
    ),
    new Promise((resolve) =>
      setTimeout(resolve, 1000),
    ),
  ])
}

export type {Lesson} from './server'

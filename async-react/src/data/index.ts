import {use, useEffect} from 'react'
import {preloadObservablePromise, useObservablePromise, useSyncObservable} from 'react-rx'
import {defer, distinctUntilChanged, scan, shareReplay, Subject, type Observable} from 'rxjs'

import {delayedFetch} from './debug'
import type {Lesson, LessonIcon} from './fake-data'

// Suspense-enabled data fetching on react-rx: canonical lesson lists are cold
// per-query observables read through useObservablePromise, and optimistic
// completion intent is a separate urgent stream merged in at the read.

/** Upstream keeps its promise cache for the session so back/forward never
 * re-suspends; approximate with a long retention window. Entries are dropped
 * earlier by revalidate() after mutations. */
const LESSONS_TTL = 10 * 60 * 1000

/** One cold observable per tab+search. react-rx's promise cache is keyed by
 * observable identity, so identity is the cache key. revalidate() drops the
 * identities, so the next transition render swaps to fresh sources. */
let queries = new Map<string, Observable<Lesson[]>>()

export function revalidate() {
  queries = new Map()
}

function lessonsFor(tab: string, search: string): Observable<Lesson[]> {
  const key = `${tab || 'all'}|${search || ''}`
  let query = queries.get(key)
  if (!query) {
    // Creating this during render fetches nothing. react-rx subscribes after
    // commit, during a live swap, or during preload.
    query = defer(() => fetchLessons(`/lessons?tab=${tab || 'all'}&q=${search || ''}`))
    queries.set(key, query)
  }
  return query
}

/** Call above the Suspense boundary and pass the promise to useLessons below. */
export function useLessonsPromise(tab: string, search: string) {
  // The observable identity is read from a cache that revalidate() swaps
  // between renders, so it is intentionally not a pure function of tab and
  // search. Compiled, the React Compiler would memoize lessonsFor on its
  // arguments and keep returning the stale identity after a mutation, and the
  // refetch would never start.
  'use no memo'
  return useObservablePromise(lessonsFor(tab, search), {ttl: LESSONS_TTL})
}

/** id -> the `complete` the user asked for but has not seen yet. */
type Wanted = ReadonlyMap<string, boolean>

type StoreEvent =
  | {type: 'want'; id: string; complete: boolean}
  | {type: 'abandon'; id: string}
  | {type: 'confirm'; lessons: Lesson[]}

const events$ = new Subject<StoreEvent>()

const wanted$ = events$.pipe(
  scan(reduceWanted, new Map<string, boolean>()),
  distinctUntilChanged(),
  shareReplay({bufferSize: 1, refCount: false}),
)
// An intent recorded while no list is mounted must survive navigation.
wanted$.subscribe()

/** Read intent below the Suspense boundary so its urgent update cannot suspend
 * the committed tree. Only committed server data retires an intent. */
export function useLessons(promise: Promise<Lesson[]>): Lesson[] {
  const lessons = use(promise)
  const wanted = useSyncObservable(wanted$, null)
  useEffect(() => {
    events$.next({type: 'confirm', lessons})
  }, [lessons])
  return applyWanted(lessons, wanted)
}

/** Record intent before the POST so the check flips in the same event tick.
 * Drop it before rethrowing a failure so the action rejects with data restored. */
export function setComplete(id: string, complete: boolean): Promise<void> {
  events$.next({type: 'want', id, complete})
  return delayedFetch(`/lesson/${id}/toggle`, {method: 'POST'}).then(
    () => undefined,
    (error: unknown) => {
      events$.next({type: 'abandon', id})
      throw error
    },
  )
}

function reduceWanted(wanted: Wanted, event: StoreEvent): Wanted {
  switch (event.type) {
    case 'want':
      return new Map(wanted).set(event.id, event.complete)
    case 'abandon':
      return retire(wanted, (id) => id === event.id)
    case 'confirm':
      return retire(wanted, (id, complete) =>
        event.lessons.some((lesson) => lesson.id === id && lesson.complete === complete),
      )
  }
}

function applyWanted(lessons: Lesson[], wanted: Wanted | null): Lesson[] {
  if (!wanted || wanted.size === 0) return lessons
  return lessons.map((lesson) =>
    wanted.has(lesson.id) && wanted.get(lesson.id) !== lesson.complete
      ? {...lesson, complete: !lesson.complete}
      : lesson,
  )
}

/** Preserve the reference when nothing matched so distinctUntilChanged drops
 * confirmation no-ops. */
function retire(wanted: Wanted, matches: (id: string, complete: boolean) => boolean): Wanted {
  const next = new Map(wanted)
  for (const [id, complete] of wanted) {
    if (matches(id, complete)) next.delete(id)
  }
  return next.size === wanted.size ? wanted : next
}

export function prefetchLessons() {
  // Warm the identity Home will render so a fast login needs no fallback.
  return Promise.race([preloadObservablePromise(lessonsFor('all', '')), delay(1000)])
}

export async function login() {
  await delayedFetch('/login', {method: 'POST'})
  revalidate()
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

const LESSON_ICONS: LessonIcon[] = [
  'lightbulb',
  'shuffle',
  'zap',
  'hourglass',
  'fastforward',
  'puzzle',
]

function isLessonIcon(value: unknown): value is LessonIcon {
  return LESSON_ICONS.some((icon) => icon === value)
}

function parseLesson(value: unknown): Lesson {
  if (
    typeof value !== 'object' ||
    value === null ||
    !('id' in value) ||
    typeof value.id !== 'string' ||
    !('title' in value) ||
    typeof value.title !== 'string' ||
    !('description' in value) ||
    typeof value.description !== 'string' ||
    !('complete' in value) ||
    typeof value.complete !== 'boolean' ||
    !('icon' in value) ||
    !isLessonIcon(value.icon)
  ) {
    throw new TypeError('The lessons endpoint returned a malformed lesson')
  }
  return {
    id: value.id,
    title: value.title,
    description: value.description,
    icon: value.icon,
    complete: value.complete,
  }
}

function parseLessons(value: unknown): Lesson[] {
  if (!Array.isArray(value)) {
    throw new TypeError('The lessons endpoint did not return a list')
  }
  return value.map(parseLesson)
}

function fetchLessons(url: string): Promise<Lesson[]> {
  return delayedFetch(url).then(parseLessons)
}

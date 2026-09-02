import {use, useEffect} from 'react'
import {preloadObservablePromise, useObservablePromise, useSyncObservable} from 'react-rx'
import {BehaviorSubject, defer, type Observable} from 'rxjs'

import type {Lesson, LessonIcon} from './fake-data'

// Suspense-enabled data fetching on react-rx: canonical lesson lists are cold
// per-query observables read through useObservablePromise, and optimistic
// completion intent is a separate urgent stream merged in at the read.

/** Upstream keeps its promise cache for the session so back/forward never
 * re-suspends; approximate with a long retention window. Entries are dropped
 * earlier by revalidate() after mutations. */
const LESSONS_TTL = 10 * 60 * 1000

/** One cold observable per tab+search+revision. react-rx's promise cache is
 * keyed by observable identity, so identity is the cache key. refresh() bumps
 * the router revision after revalidate(), so the next transition render maps
 * to a fresh observable and refetches. */
let queries = new Map<string, Observable<Lesson[]>>()

export function revalidate() {
  queries = new Map()
}

function queryKey(tab: string, search: string, revision: number): string {
  return JSON.stringify([tab, search, revision])
}

function lessonsUrl(tab: string, search: string): string {
  const query = new URLSearchParams({tab, q: search})
  return `/api/lessons?${query}`
}

function lessonsFor(tab: string, search: string, revision: number): Observable<Lesson[]> {
  const key = queryKey(tab, search, revision)
  let query = queries.get(key)
  if (!query) {
    // Creating this during render fetches nothing. react-rx subscribes after
    // commit, during a live swap, or during preload.
    query = defer(() => fetchLessons(lessonsUrl(tab, search)))
    queries.set(key, query)
  }
  return query
}

/** Call above the Suspense boundary and pass the promise to useLessons below. */
export function useLessonsPromise(tab: string, search: string, revision: number) {
  return useObservablePromise(lessonsFor(tab, search, revision), {ttl: LESSONS_TTL})
}

export function prefetchLessons(revision: number) {
  // Warm the identity Home will render so a fast login needs no fallback.
  return Promise.race([preloadObservablePromise(lessonsFor('all', '', revision)), delay(1000)])
}

export async function login() {
  await fetchJson('/api/login', {method: 'POST'})
  revalidate()
}

/** id -> the `complete` the user asked for but has not seen yet. */
type Wanted = ReadonlyMap<string, boolean>

const wanted$ = new BehaviorSubject<Wanted>(new Map())

/** Read intent below the Suspense boundary so its urgent update cannot suspend
 * the committed tree. Only committed server data retires an intent. */
export function useLessons(promise: Promise<Lesson[]>): Lesson[] {
  const lessons = use(promise)
  const wanted = useSyncObservable(wanted$, () => wanted$.getValue())
  useEffect(() => {
    wanted$.next(
      retire(wanted$.getValue(), (id, complete) =>
        lessons.some((lesson) => lesson.id === id && lesson.complete === complete),
      ),
    )
  }, [lessons])
  return applyWanted(lessons, wanted)
}

/** Record the intent before the POST so the check flips in the same event
 * tick. `complete` is the value the user expects to see; the endpoint itself
 * only toggles. A failed POST drops exactly this intent before rethrowing. */
export async function toggleComplete(id: string, complete: boolean): Promise<void> {
  wanted$.next(new Map(wanted$.getValue()).set(id, complete))
  try {
    await fetchJson(`/api/lesson/${id}/toggle`, {method: 'POST'})
  } catch (error) {
    wanted$.next(
      retire(
        wanted$.getValue(),
        (wantedId, wantedComplete) => wantedId === id && wantedComplete === complete,
      ),
    )
    throw error
  }
}

function applyWanted(lessons: Lesson[], wanted: Wanted): Lesson[] {
  if (wanted.size === 0) return lessons
  return lessons.map((lesson) => {
    const want = wanted.get(lesson.id)
    return want === undefined || want === lesson.complete ? lesson : {...lesson, complete: want}
  })
}

/** Preserve the reference when nothing matched so useSyncExternalStore's
 * Object.is bailout skips the re-render. */
function retire(wanted: Wanted, matches: (id: string, complete: boolean) => boolean): Wanted {
  const next = new Map(wanted)
  for (const [id, complete] of wanted) {
    if (matches(id, complete)) next.delete(id)
  }
  return next.size === wanted.size ? wanted : next
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

async function fetchJson(url: string, options?: RequestInit): Promise<unknown> {
  const response = await fetch(url, options)
  if (!response.ok) {
    throw new Error(`${options?.method ?? 'GET'} ${url} failed with ${response.status}`)
  }
  return response.json()
}

function fetchLessons(url: string): Promise<Lesson[]> {
  return fetchJson(url).then(parseLessons)
}

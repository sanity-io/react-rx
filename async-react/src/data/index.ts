import {preloadObservablePromise} from 'react-rx'

import {createObservableCache} from './cache'
import type {Lesson, LessonIcon} from './fake-data'

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

function lessonsUrl(tab: string, search: string): string {
  const query = new URLSearchParams({tab, q: search})
  return `/api/lessons?${query}`
}

/**
 * One shared observable per (tab, search, revision). Concurrent subscribers —
 * renders, Suspense retries, the login prefetch — dedupe into one request, and
 * a result replays for five minutes after it arrives. Mutations and
 * `router.refresh()` call `revalidate()`, which drops every entry eagerly; the
 * router's `revision` is an input too so a refresh changes what a memoized
 * render asks for and re-reads the store.
 */
export const lessons$ = createObservableCache(
  (tab: string, search: string, _revision: number) => fetchLessons(lessonsUrl(tab, search)),
  {ttl: 5 * 60_000},
)

export function revalidate() {
  lessons$.clear()
}

export function prefetchLessons(revision: number) {
  const promise = preloadObservablePromise(lessons$('all', '', revision))
  return Promise.race([promise, delay(1000)])
}

export async function mutateToggle(id: string) {
  await fetchJson(`/api/lesson/${id}/toggle`, {method: 'POST'})
  revalidate()
}

export async function login() {
  await fetchJson('/api/login', {method: 'POST'})
  revalidate()
}

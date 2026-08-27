import {delayedFetch} from './debug'
import type {Lesson, LessonIcon} from './fake-data'

// With suspense-enabled data fetching.
// These use a cache for suspense-enabled data fetching.
let lessonsCache = new Map<string, Promise<Lesson[]>>()

export function revalidate() {
  lessonsCache = new Map()
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

function lessonCacheKey(tab: string, search: string): string {
  return JSON.stringify([tab, search])
}

function lessonsUrl(tab: string, search: string): string {
  const query = new URLSearchParams({tab, q: search})
  return `/lessons?${query}`
}

export function prefetchLessons() {
  const tab = 'all'
  const search = ''
  const promise = fetchLessons(lessonsUrl(tab, search))
  lessonsCache.set(lessonCacheKey(tab, search), promise)
  return Promise.race([promise, delay(1000)])
}

export function getLessons(tab: string, search: string): Promise<Lesson[]> {
  const resolvedTab = tab || 'all'
  const resolvedSearch = search || ''
  const key = lessonCacheKey(resolvedTab, resolvedSearch)
  const cached = lessonsCache.get(key)
  if (cached) {
    return cached
  }

  const promise = fetchLessons(lessonsUrl(resolvedTab, resolvedSearch))
  lessonsCache.set(key, promise)
  return promise
}

export async function mutateToggle(id: string) {
  return delayedFetch(`/lesson/${id}/toggle`, {
    method: 'POST',
  }).then(() => {
    revalidate()
  })
}

export async function login() {
  return delayedFetch('/login', {
    method: 'POST',
  }).then(() => {
    revalidate()
  })
}

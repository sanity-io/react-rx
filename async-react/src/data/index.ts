import type {Lesson, LessonIcon} from './fake-data'

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

function lessonCacheKey(tab: string, search: string, revision: number): string {
  return JSON.stringify([tab, search, revision])
}

function lessonsUrl(tab: string, search: string): string {
  const query = new URLSearchParams({tab, q: search})
  return `/api/lessons?${query}`
}

export function prefetchLessons(revision: number) {
  const tab = 'all'
  const search = ''
  const promise = fetchLessons(lessonsUrl(tab, search))
  lessonsCache.set(lessonCacheKey(tab, search, revision), promise)
  return Promise.race([promise, delay(1000)])
}

export function getLessons(tab: string, search: string, revision: number): Promise<Lesson[]> {
  const resolvedTab = tab || 'all'
  const resolvedSearch = search || ''
  const key = lessonCacheKey(resolvedTab, resolvedSearch, revision)
  const cached = lessonsCache.get(key)
  if (cached) {
    return cached
  }

  const promise = fetchLessons(lessonsUrl(resolvedTab, resolvedSearch))
  lessonsCache.set(key, promise)
  return promise
}

export async function mutateToggle(id: string) {
  await fetchJson(`/api/lesson/${id}/toggle`, {method: 'POST'})
  revalidate()
}

export async function login() {
  await fetchJson('/api/login', {method: 'POST'})
  revalidate()
}

/**
 * ─── MOCK ────────────────────────────────────────────────────────────────
 * The "backend": lesson data and endpoints with a configurable delay, a
 * stand-in for the Express server in the original demo. Everything outside
 * this file is what your own code would look like.
 */

export interface Lesson {
  id: string
  title: string
  description: string
  complete: boolean
}

const lessons: Lesson[] = [
  {
    id: '1',
    title: 'Intro',
    description: 'Introduction to Async React',
    complete: false,
  },
  {
    id: '2',
    title: 'Transitions',
    description: 'Coordinating async',
    complete: false,
  },
  {
    id: '3',
    title: 'Actions',
    description: 'Coordinating changes',
    complete: false,
  },
  {
    id: '4',
    title: 'Suspense',
    description: 'Deferred loading',
    complete: false,
  },
  {
    id: '5',
    title: 'Optimistic updates',
    description: 'Pretending async is sync',
    complete: false,
  },
  {
    id: '6',
    title: 'Putting it together',
    description: 'The vision for Async React',
    complete: false,
  },
]

function respond<T>(
  value: T,
  delay: number,
): Promise<T> {
  return new Promise((resolve) =>
    setTimeout(() => resolve(value), delay),
  )
}

export function getLessons(
  tab: string,
  search: string,
  delay: number,
): Promise<Lesson[]> {
  let result = [...lessons]
  if (tab === 'wip')
    result = result.filter(
      (lesson) => !lesson.complete,
    )
  if (tab === 'done')
    result = result.filter(
      (lesson) => lesson.complete,
    )
  if (search) {
    const q = search.toLowerCase()
    result = result.filter((lesson) =>
      `${lesson.title} ${lesson.description}`
        .toLowerCase()
        .includes(q),
    )
  }
  return respond(result, delay)
}

export function postToggle(
  id: string,
  delay: number,
): Promise<void> {
  const lesson = lessons.find(
    (item) => item.id === id,
  )
  if (lesson) lesson.complete = !lesson.complete
  return respond(undefined, delay)
}

export function postLogin(
  delay: number,
): Promise<void> {
  return respond(undefined, delay)
}

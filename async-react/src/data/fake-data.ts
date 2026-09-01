import * as fuzzy from 'fast-fuzzy'

export type LessonIcon = 'lightbulb' | 'shuffle' | 'zap' | 'hourglass' | 'fastforward' | 'puzzle'

export interface Lesson {
  id: string
  title: string
  description: string
  icon: LessonIcon
  complete: boolean
}

const lessons: Lesson[] = [
  {
    id: '1',
    title: 'Intro',
    description: 'Introduction to Async React',
    icon: 'lightbulb',
    complete: false,
  },
  {
    id: '2',
    title: 'Transitions',
    description: 'Coordinating Async',
    icon: 'shuffle',
    complete: false,
  },
  {
    id: '3',
    title: 'Actions',
    description: 'Coordinating changes',
    icon: 'zap',
    complete: false,
  },
  {
    id: '4',
    title: 'Suspense',
    description: 'Deferred loading',
    icon: 'hourglass',
    complete: false,
  },
  {
    id: '5',
    title: 'Optimistic updates',
    description: 'Pretending async is sync',
    icon: 'fastforward',
    complete: false,
  },
  {
    id: '6',
    title: 'Putting it together',
    description: 'The vision for Async React',
    icon: 'puzzle',
    complete: false,
  },
]

export async function getLessons(
  tab: string | undefined,
  search: string | undefined,
  delay: number,
): Promise<Lesson[]> {
  let filteredLessons = [...lessons]
  if (tab === 'wip') {
    filteredLessons = lessons.filter((lesson) => !lesson.complete)
  } else if (tab === 'done') {
    filteredLessons = lessons.filter((lesson) => lesson.complete)
  }
  if (search != null && search !== '' && search !== 'undefined') {
    filteredLessons = fuzzy.search(search, filteredLessons, {
      keySelector: (obj) => obj.title + ' ' + obj.description,
      threshold: 0.9,
    })
  }

  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(filteredLessons)
    }, delay)
  })
}

export async function postLessonToggle(id: string, delay: number): Promise<void> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const lesson = lessons.find((candidate) => candidate.id === id)
      if (!lesson) {
        reject(new Error(`Unknown lesson id: ${id}`))
        return
      }
      lesson.complete = !lesson.complete
      resolve()
    }, delay)
  })
}

export async function postLogin(delay: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve()
    }, delay)
  })
}

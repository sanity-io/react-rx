import {Suspense, use, useMemo} from 'react'
import {useObservablePromise} from 'react-rx'

import {
  type Lesson,
  lessons$,
  revalidateLessons,
  toggleLesson,
} from './api'
import {
  CompleteButton,
  EmptyList,
  FallbackList,
  LessonCard,
  SearchInput,
  TabList,
} from './design'
import {useRouter} from './router'

function LessonList({
  promise,
  completeAction,
}: {
  promise: Promise<Lesson[]>
  completeAction: (id: string) => Promise<void>
}) {
  // use() suspends until the first result. Search/tab changes arrive
  // through transitions, so the fallback only ever shows on first load —
  // and stream revalidations update this list in place.
  const lessons = use(promise)

  if (lessons.length === 0) {
    return <EmptyList />
  }
  return (
    <div>
      {lessons.map((item) => (
        <LessonCard key={item.id} item={item}>
          <CompleteButton
            complete={item.complete}
            action={() => completeAction(item.id)}
          />
        </LessonCard>
      ))}
    </div>
  )
}

export default function Home() {
  const router = useRouter()
  const search = router.search.q ?? ''
  const tab = router.search.tab ?? 'all'

  // The suspense-by-default data layer: one stream per tab+search, read as
  // a use()-compatible promise. Created here, in a component that does not
  // itself suspend, so retries always see the same promise.
  const promise = useObservablePromise(
    useMemo(
      () => lessons$(tab, search),
      [tab, search],
    ),
  )

  // These are Actions: the design components run them inside transitions.
  function searchAction(value: string) {
    router.setParams('q', value)
  }
  function tabAction(value: string) {
    router.setParams('tab', value)
  }
  async function completeAction(id: string) {
    await toggleLesson(id)
    // Refetch every live lesson stream and wait for this view's fresh data,
    // so the button's pending state covers the mutation and the refetch.
    await revalidateLessons(tab, search)
  }

  return (
    <>
      <SearchInput
        value={search}
        changeAction={searchAction}
      />
      <TabList
        activeTab={tab}
        changeAction={tabAction}
      >
        <Suspense fallback={<FallbackList />}>
          <LessonList
            promise={promise}
            completeAction={completeAction}
          />
        </Suspense>
      </TabList>
    </>
  )
}

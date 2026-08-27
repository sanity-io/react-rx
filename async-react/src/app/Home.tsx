import {Suspense, ViewTransition} from 'react'

import type {Lesson as LessonItem} from '@/data/fake-data'
import * as data from '@/data/index'
import * as Design from '@/design'
import {useRouter} from '@/router/index'

function Lesson({
  item,
  completeAction,
}: {
  item: LessonItem
  completeAction: (id: string, complete: boolean) => Promise<void>
}) {
  return (
    <Design.LessonCard item={item}>
      {/*
          Design.CompleteButton is using the action prop pattern to automatically
          show a loading state if the toggle takes longer than 150ms. It renders
          item.complete directly because the list already carries what the user
          asked for.
      */}
      <Design.CompleteButton
        complete={item.complete}
        action={(complete) => completeAction(item.id, complete)}
      ></Design.CompleteButton>
    </Design.LessonCard>
  )
}

function LessonList({
  lessonsPromise,
  completeAction,
}: {
  lessonsPromise: Promise<LessonItem[]>
  completeAction: (id: string, complete: boolean) => Promise<void>
}) {
  /**
   * The promise suspends until canonical data arrives. data.useLessons also
   * reads pending intent synchronously below this Suspense boundary, so an
   * optimistic re-render cannot re-run the observable lookup in Home and suspend.
   */
  const lessons = data.useLessons(lessonsPromise)

  if (lessons.length === 0) {
    return (
      <ViewTransition key="empty" default="none" enter="auto" exit="auto">
        <Design.EmptyList />
      </ViewTransition>
    )
  }

  return (
    /**
     * This ViewTransition will cross-fade results to No Results.
     */
    <ViewTransition key="results" default="none" enter="auto" exit="auto">
      <Design.List>
        {lessons.map((item) => (
          /**
           * This ViewTransition will animate unique items in the list.
           * For example, when searching, existing items will "move" to
           * their new positions, and new items will fade in. Items that
           * are no longer in the list will fade out.
           */
          <ViewTransition key={item.id}>
            <div>
              <ViewTransition default="none">
                <Lesson item={item} completeAction={completeAction} />
              </ViewTransition>
            </div>
          </ViewTransition>
        ))}
      </Design.List>
    </ViewTransition>
  )
}

export default function Home() {
  const router = useRouter()
  const search = router.search.q || ''
  const tab = router.search.tab || 'all'
  const revision = router.revision
  /**
   * One observable identity per tab+search+revision lets a router transition
   * hold the current list while react-rx fetches the next one. refresh()
   * bumps the revision, so post-mutation refetches ride the same mechanism.
   */
  const lessonsPromise = data.useLessonsPromise(tab, search, revision)

  function searchAction(value: string) {
    /**
     * Since this is an Action we know this updates in a transition.
     */
    router.setParams('q', value)
  }
  function tabAction(value: string) {
    /**
     * Since this is an Action we know this updates in a transition.
     */
    router.setParams('tab', value)
  }

  async function completeAction(id: string, complete: boolean) {
    /**
     * Since we're in an Action we know we're in a transition. setComplete has
     * already recorded the user's intent, so the check has flipped. Awaiting
     * keeps the pending state active through the mutation and later updates.
     */
    await data.setComplete(id, complete)

    /**
     * After the mutation we need to revalidate the data cache.
     * In this example app, our router and data layer are integrated,
     * so when you call `refresh` on the current route, the data cache
     * is automatically cleared so re-rendering the route re-fetches data.
     *
     * Note: We don't have to wrap this in startTransition because
     * the router wraps these updates in a transition automatically.
     */
    router.refresh()
  }
  return (
    <>
      {/*
         Design.SearchInput is using the action prop pattern to automatically 
         show a loading state while the action is pending (delayed by 1.5s).
         The input state is updated with useOptimistic so it updates immediately
         while the transition to the new URL is pending.
      */}
      <Design.SearchInput value={search} changeAction={searchAction} />
      {/*
         Design.TabList is using the action prop pattern to optimistically 
         update the selected tab while the action is pending. If the action 
         takes longer than 150ms, it automatically shows a loading state on
         the tab, so the user knows their optimistic tab is still loading.
      */}
      <Design.TabList activeTab={tab} changeAction={tabAction}>
        {/*
           This fallback will be shown when the LessonList suspends initially.
           It will not be show again, like when switching tabs or searching,
           because those updates are wrapped in transitions. Instead of showing
           the fallback again, the list will be updated in the background and
           the optimistic/pending states will be used to show loading instead.
        */}
        <Suspense fallback={<Design.FallbackList />}>
          <LessonList lessonsPromise={lessonsPromise} completeAction={completeAction} />
        </Suspense>
      </Design.TabList>
    </>
  )
}

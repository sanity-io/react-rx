<<<<<<< HEAD
import {Suspense, ViewTransition} from 'react'
=======
import {Suspense, use, ViewTransition} from 'react'
>>>>>>> origin/current

import type {Lesson as LessonItem} from '@/data/fake-data'
import * as data from '@/data/index'
import * as Design from '@/design'
import {useRouter} from '@/router/index'

function Lesson({
  item,
  completeAction,
}: {
  item: LessonItem
<<<<<<< HEAD
  completeAction: (id: string, complete: boolean) => Promise<void>
}) {
=======
  completeAction: (id: string) => Promise<void>
}) {
  async function action() {
    await completeAction(item.id)
  }
>>>>>>> origin/current
  return (
    <Design.LessonCard item={item}>
      {/*
          Design.CompleteButton is using the action prop pattern to automatically
          show a loading state if the toggle takes longer than 150ms. It renders
          item.complete directly because the list already carries what the user
          asked for.
      */}
<<<<<<< HEAD
      <Design.CompleteButton
        complete={item.complete}
        action={(complete) => completeAction(item.id, complete)}
      ></Design.CompleteButton>
=======
      <Design.CompleteButton complete={item.complete} action={action}></Design.CompleteButton>
>>>>>>> origin/current
    </Design.LessonCard>
  )
}

function LessonList({
<<<<<<< HEAD
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
=======
  tab,
  search,
  revision,
  completeAction,
}: {
  tab: string
  search: string
  revision: number
  completeAction: (id: string) => Promise<void>
}) {
  /**
   * data.getLessons is a suspense-enabled data fetching function.
   * It returns a cached promise that fetched the first time it's called
   * with a given tab+search+revision, then it returns the resolved data on subsequent calls.
   *
   * Since it's cached, there needs to be a way to clear the cache and re-fetch the data,
   * like after a mutation like toggling complete. This is done with the data.revalidate() function,
   * which is called in the completeAction below.
   *
   * The use(data.getLessons(...)) call here will suspend the component
   * until the promise resolves, then return the resolved data.
   */
  const lessons = use(data.getLessons(tab, search, revision))
>>>>>>> origin/current

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
<<<<<<< HEAD
  /**
   * One observable identity per tab+search lets a router transition hold the
   * current list while react-rx fetches the next one.
   */
  const lessonsPromise = data.useLessonsPromise(tab, search)
=======
  const revision = router.revision
>>>>>>> origin/current

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

<<<<<<< HEAD
  async function completeAction(id: string, complete: boolean) {
=======
  async function completeAction(id: string) {
>>>>>>> origin/current
    /**
     * Since we're in an Action we know we're in a transition. setComplete has
     * already recorded the user's intent, so the check has flipped. Awaiting
     * keeps the pending state active through the mutation and later updates.
     */
<<<<<<< HEAD
    await data.setComplete(id, complete)
=======
    await data.mutateToggle(id)
>>>>>>> origin/current

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
<<<<<<< HEAD
          <LessonList lessonsPromise={lessonsPromise} completeAction={completeAction} />
=======
          <LessonList
            tab={tab}
            search={search}
            revision={revision}
            completeAction={completeAction}
          />
>>>>>>> origin/current
        </Suspense>
      </Design.TabList>
    </>
  )
}

import {
  type ChangeEvent,
  type ReactNode,
  startTransition,
  useOptimistic,
  useTransition,
} from 'react'

import type {Lesson} from './api'

/**
 * The design system half of the demo: components that take `action` props
 * and own their own pending/optimistic feedback, so product code never
 * writes loading-state plumbing. The trick that makes a fast network feel
 * synchronous is in demo.css — pending shimmers only become visible after
 * an animation-delay (300ms / 1.5s), so quick actions never flash UI.
 */

/** A button whose action runs in a transition; shows a spinner while pending. */
export function Button({
  action,
  children,
}: {
  action: () => Promise<void>
  children: ReactNode
}) {
  const [isPending, transition] = useTransition()

  return (
    <button
      type="button"
      aria-busy={isPending}
      disabled={isPending}
      onClick={() => {
        transition(async () => {
          await action()
        })
      }}
    >
      {isPending ? 'Logging in' : children}
    </button>
  )
}

/**
 * The complete-toggle: optimistically flips the checkmark, and if the
 * action takes longer than 300ms a shimmer appears over the button.
 */
export function CompleteButton({
  complete,
  action,
}: {
  complete: boolean
  action: () => Promise<void>
}) {
  const [
    optimisticComplete,
    setOptimisticComplete,
  ] = useOptimistic(complete)
  const [isPending, transition] = useTransition()

  return (
    <button
      type="button"
      className="outline complete-button overlay-host"
      aria-label={
        optimisticComplete
          ? 'Mark incomplete'
          : 'Mark complete'
      }
      onClick={() => {
        transition(async () => {
          setOptimisticComplete(
            !optimisticComplete,
          )
          await action()
        })
      }}
    >
      {optimisticComplete ? <ins>✓</ins> : ' '}
      <span
        className={`shimmer${isPending ? ' is-pending' : ''}`}
      />
    </button>
  )
}

/**
 * The search input: useOptimistic shows what you typed immediately, while
 * the committed value travels through the router transition. The shimmer
 * only appears if the transition is still pending after 1.5s.
 */
export function SearchInput({
  value,
  changeAction,
}: {
  value: string
  changeAction: (value: string) => void
}) {
  const [inputValue, setInputValue] =
    useOptimistic(value)
  const isPending = inputValue !== value

  function handleChange(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const newValue = event.currentTarget.value
    startTransition(() => {
      setInputValue(newValue)
      changeAction(newValue)
    })
  }

  return (
    <div className="overlay-host">
      <input
        type="search"
        placeholder="Search…"
        value={inputValue}
        onChange={handleChange}
      />
      <span
        className={`shimmer long${isPending ? ' is-pending' : ''}`}
      />
    </div>
  )
}

const TABS = [
  {id: 'all', label: 'All'},
  {id: 'wip', label: 'In progress'},
  {id: 'done', label: 'Complete'},
]

/**
 * Tabs: the clicked tab is selected optimistically; if loading its data
 * takes longer than 300ms, the tab itself shimmers.
 */
export function TabList({
  activeTab,
  changeAction,
  children,
}: {
  activeTab: string
  changeAction: (tab: string) => void
  children: ReactNode
}) {
  const [optimisticTab, setOptimisticTab] =
    useOptimistic(activeTab)
  const isPending = optimisticTab !== activeTab

  return (
    <>
      <div role="group">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`overlay-host${tab.id === optimisticTab ? '' : ' outline'}`}
            onClick={() => {
              startTransition(() => {
                setOptimisticTab(tab.id)
                changeAction(tab.id)
              })
            }}
          >
            {tab.label}
            <span
              className={`shimmer${isPending && tab.id === optimisticTab ? ' is-pending' : ''}`}
            />
          </button>
        ))}
      </div>
      {children}
    </>
  )
}

export function LessonCard({
  item,
  children,
}: {
  item: Lesson
  children: ReactNode
}) {
  return (
    <article className="lesson">
      <div>
        <strong>{item.title}</strong>
        <br />
        <small>{item.description}</small>
      </div>
      {children}
    </article>
  )
}

const SKELETON_ROWS = [
  's1',
  's2',
  's3',
  's4',
  's5',
  's6',
]

export function FallbackList() {
  return (
    <div>
      {SKELETON_ROWS.map((row) => (
        <article className="lesson" key={row}>
          <div>
            <span
              className="skeleton"
              style={{width: '6rem'}}
            />
            <br />
            <span
              className="skeleton"
              style={{width: '10rem'}}
            />
          </div>
          <span
            className="skeleton"
            style={{
              width: '2.5rem',
              height: '2.5rem',
            }}
          />
        </article>
      ))}
    </div>
  )
}

export function EmptyList() {
  return (
    <article className="lesson">
      <div>
        <strong>Woah!</strong>
        <br />
        <small>No lessons found</small>
      </div>
    </article>
  )
}

export function LoginForm({
  fields,
  setFields,
  children,
}: {
  fields: {username: string; password: string}
  setFields: (
    updater: (prev: {
      username: string
      password: string
    }) => {
      username: string
      password: string
    },
  ) => void
  children: ReactNode
}) {
  return (
    <form
      onSubmit={(event) => event.preventDefault()}
    >
      <h4>Async React Course</h4>
      <p>
        <small>
          Enter your email below to login to your
          account
        </small>
      </p>
      <label>
        Email
        <input
          type="email"
          value={fields.username}
          onChange={(e) =>
            setFields((f) => ({
              ...f,
              username: e.currentTarget.value,
            }))
          }
        />
      </label>
      <label>
        Password
        <input
          type="password"
          value={fields.password}
          onChange={(e) =>
            setFields((f) => ({
              ...f,
              password: e.currentTarget.value,
            }))
          }
        />
      </label>
      {children}
    </form>
  )
}

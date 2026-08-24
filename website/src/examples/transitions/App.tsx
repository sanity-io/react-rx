import {
  Suspense,
  useEffect,
  useState,
  useTransition,
} from 'react'
import {
  preloadObservablePromise,
  useObservablePromise,
} from 'react-rx'

import {
  fetchProfile$,
  resetProfileCache,
} from './api'
import ProfileCard from './ProfileCard'

const NAMES = ['Ada', 'Grace', 'Alan'] as const

function Spinner() {
  return <p style={{opacity: 0.7}}>🌀 Loading…</p>
}

/**
 * Mounted only while a transition is pending, so the clock starts at zero on
 * mount and the effect manages nothing but the interval. Without the preload
 * it climbs forever: the transition render suspends on a promise that nothing
 * has started, a suspended transition never commits, and only a commit (or a
 * preload) starts the fetch.
 */
function PendingTimer() {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const startedAt = Date.now()
    const id = setInterval(() => {
      setElapsed(Date.now() - startedAt)
    }, 100)
    return () => clearInterval(id)
  }, [])

  return (
    <>
      ⏳ transition pending for{' '}
      {(elapsed / 1000).toFixed(1)}s…
    </>
  )
}

function TransitionStatus({
  pending,
}: {
  pending: boolean
}) {
  return (
    <p
      style={{
        minHeight: '1.5em',
        margin: '8px 0',
      }}
    >
      {pending ? (
        <PendingTimer />
      ) : (
        'idle — no transition pending'
      )}
    </p>
  )
}

function ProfileSwitcher({
  withPreload,
}: {
  withPreload: boolean
}) {
  const [name, setName] =
    useState<(typeof NAMES)[number]>('Ada')
  const [isPending, startTransition] =
    useTransition()
  // Same Map-cached instance the click handler preloads — identity is the key.
  const promise = useObservablePromise(
    fetchProfile$(name),
  )

  return (
    <>
      <div style={{display: 'flex', gap: 8}}>
        {NAMES.map((candidate) => (
          <button
            key={candidate}
            type="button"
            onClick={() => {
              if (withPreload) {
                // The fix: start the fetch NOW, in the event handler, so the
                // transition render suspends on an in-flight promise and can
                // commit once it resolves.
                void preloadObservablePromise(
                  fetchProfile$(candidate),
                )
              }
              // The trap: without the preload, swapping to a never-fetched
              // observable suspends this transition render on a promise that
              // nothing has started — and it never commits, so the fetch
              // never starts.
              startTransition(() => {
                setName(candidate)
              })
            }}
            style={{
              fontWeight:
                candidate === name ? 700 : 400,
            }}
          >
            {candidate}
          </button>
        ))}
      </div>
      <TransitionStatus pending={isPending} />
      <Suspense fallback={<Spinner />}>
        <ProfileCard promise={promise} />
      </Suspense>
    </>
  )
}

export default function App() {
  const [withPreload, setWithPreload] =
    useState(false)
  const [epoch, setEpoch] = useState(0)

  return (
    <div
      style={{
        fontFamily: 'system-ui',
        padding: 16,
        maxWidth: 480,
      }}
    >
      <h2 style={{marginTop: 0}}>
        Swap observables inside a transition
      </h2>
      <p style={{fontSize: 14}}>
        Each profile fetch takes ~1.5s. With the
        checkbox off, switching to a profile that
        has never loaded wedges the transition
        forever. Ticking the checkbox and clicking
        again rescues it.
      </p>
      <label
        style={{
          display: 'block',
          marginBottom: 8,
        }}
      >
        <input
          type="checkbox"
          checked={withPreload}
          onChange={(event) =>
            setWithPreload(
              event.currentTarget.checked,
            )
          }
        />{' '}
        <code>preloadObservablePromise</code> in
        the click handler
      </label>
      <button
        type="button"
        onClick={() => {
          resetProfileCache()
          setEpoch((n) => n + 1)
        }}
        style={{marginBottom: 12}}
      >
        Reset demo (forget all profiles)
      </button>
      <ProfileSwitcher
        key={epoch}
        withPreload={withPreload}
      />
    </div>
  )
}

import {
  Suspense,
  useEffect,
  useState,
  useTransition,
} from 'react'
import {useObservablePromise} from 'react-rx'

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
 * Mounted only while a transition is pending — the window where the
 * swapped-in profile is still fetching and the previous one stays visible.
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

function ProfileSwitcher() {
  const [name, setName] =
    useState<(typeof NAMES)[number]>('Ada')
  const [isPending, startTransition] =
    useTransition()
  // The Map-stable identity is what routes every render to the same cache
  // entry; the long ttl keeps settled profiles retained for the whole demo
  // session so swapping back commits instantly.
  const promise = useObservablePromise(
    fetchProfile$(name),
    {ttl: 60_000},
  )

  return (
    <>
      <div style={{display: 'flex', gap: 8}}>
        {NAMES.map((candidate) => (
          <button
            key={candidate}
            type="button"
            onClick={() => {
              // React's canonical refetch pattern, no preloading required:
              // this consumer is live, so the transition render that swaps in
              // the new observable also starts its fetch. The old profile
              // stays visible while it loads, and the swap commits when the
              // fetch settles.
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
        Each profile fetch takes ~1.5s. Switching
        profiles inside a transition keeps the
        previous profile visible while the next
        one loads — only the initial mount shows
        the Suspense fallback.
      </p>
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
      <ProfileSwitcher key={epoch} />
    </div>
  )
}

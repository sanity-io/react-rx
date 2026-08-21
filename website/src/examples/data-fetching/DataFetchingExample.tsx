import {Suspense, use, useState} from 'react'
import {
  useObservablePromise,
  type ObservablePromise,
} from 'react-rx'
import {map, type Observable, timer} from 'rxjs'

const LATENCY_MS = 800

const userCache = new Map<
  string,
  Observable<{
    id: string
    name: string
    bio: string
  }>
>()

/** Stable per id so Suspense retries and remounts share one in-flight request. */
function fetchUser$(id: string) {
  let observable = userCache.get(id)
  if (!observable) {
    observable = timer(LATENCY_MS).pipe(
      map(() => ({
        id,
        name:
          id === 'alpha'
            ? 'Ada Lovelace'
            : 'Grace Hopper',
        bio: `Profile loaded for ${id}`,
      })),
    )
    userCache.set(id, observable)
  }
  return observable
}

const clock$ = timer(0, 1000).pipe(
  map(
    (n) =>
      `Tick ${n} — live updates skip the Suspense fallback`,
  ),
)

function Profile({
  promise,
}: {
  promise: ObservablePromise<{
    id: string
    name: string
    bio: string
  }>
}) {
  const user = use(promise)
  return (
    <div>
      <h3>{user.name}</h3>
      <p>{user.bio}</p>
    </div>
  )
}

function LiveClock({
  promise,
}: {
  promise: ObservablePromise<string>
}) {
  const label = use(promise)
  return (
    <p style={{fontSize: 14, opacity: 0.8}}>
      {label}
    </p>
  )
}

export default function DataFetchingExample() {
  const [id, setId] = useState('alpha')
  // Create the promises in a parent that does
  // not suspend: the fetch starts when the hook
  // caller commits (a component suspended on
  // its own promise never commits), and
  // Suspense retries always see the same
  // promise identity.
  const promise = useObservablePromise(
    fetchUser$(id),
  )
  const clockPromise =
    useObservablePromise(clock$)

  return (
    <div
      style={{
        fontFamily: 'system-ui',
        padding: 16,
      }}
    >
      <p>
        <button
          type="button"
          onClick={() => setId('alpha')}
        >
          alpha
        </button>{' '}
        <button
          type="button"
          onClick={() => setId('beta')}
        >
          beta
        </button>
      </p>
      <Suspense
        key={id}
        fallback={
          <p style={{opacity: 0.7}}>
            Loading {id}…
          </p>
        }
      >
        <Profile promise={promise} />
      </Suspense>
      <hr style={{margin: '16px 0'}} />
      <Suspense fallback={null}>
        <LiveClock promise={clockPromise} />
      </Suspense>
      <p
        style={{
          marginTop: 16,
          fontSize: 14,
          opacity: 0.75,
        }}
      >
        Switching profiles re-suspends (new
        observable). The clock updates
        continuously without flashing a fallback.
      </p>
    </div>
  )
}

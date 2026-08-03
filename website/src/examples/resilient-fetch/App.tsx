import {useObservable} from 'react-rx'
import {catchError, map, of, retry, scan, startWith, switchMap, timer} from 'rxjs'

import {fetchPrice, online$, type Snapshot} from './api'

const POLL_MS = 3000

type Status =
  | {phase: 'offline'}
  | {phase: 'fetching'}
  | {phase: 'live'; data: Snapshot}
  | {phase: 'error'; message: string}

const status$ = online$.pipe(
  // While offline, stop polling entirely. On reconnect, switchMap
  // resubscribes and timer(0, …) fires immediately — resume for free.
  switchMap((online) =>
    online
      ? timer(0, POLL_MS).pipe(
          switchMap(() =>
            fetchPrice().pipe(
              map((data): Status => ({phase: 'live', data})),
              // Transient failures retry with exponential backoff…
              retry({count: 3, delay: (_error, attempt) => timer(300 * 2 ** attempt)}),
              // …and only after that surface as an error (caught on the inner
              // observable, so the polling timer itself survives).
              catchError((error: Error) => of<Status>({phase: 'error', message: error.message})),
              startWith<Status>({phase: 'fetching'}),
            ),
          ),
        )
      : of<Status>({phase: 'offline'}),
  ),
)

// Keep the last good snapshot visible through fetching/offline/error phases.
const view$ = status$.pipe(
  scan(
    (view, status) => ({status, last: status.phase === 'live' ? status.data : view.last}),
    {status: {phase: 'fetching'} as Status, last: undefined as Snapshot | undefined},
  ),
)

export default function App() {
  const {status, last} = useObservable(view$, {status: {phase: 'fetching'}, last: undefined})
  const online = useObservable(online$, true)

  return (
    <>
      <h4>ACME stock</h4>
      {last ? (
        <p style={{opacity: status.phase === 'live' ? 1 : 0.6}}>
          <strong>${last.price.toFixed(2)}</strong>{' '}
          <small>as of {new Date(last.at).toLocaleTimeString()}</small>
        </p>
      ) : (
        <p aria-busy="true">Fetching first price…</p>
      )}
      <p>
        <StatusLine status={status} />
      </p>
      <button type="button" onClick={() => online$.next(!online)}>
        {online ? 'Simulate going offline' : 'Go back online'}
      </button>
    </>
  )
}

function StatusLine({status}: {status: Status}) {
  switch (status.phase) {
    case 'live':
      return <small>live — polling every {POLL_MS / 1000}s</small>
    case 'fetching':
      return <small aria-busy="true">fetching…</small>
    case 'error':
      return (
        <small>
          <mark>{status.message}</mark> — retrying on the next poll
        </small>
      )
    case 'offline':
      return <small>offline — polling paused, last price kept</small>
  }
}

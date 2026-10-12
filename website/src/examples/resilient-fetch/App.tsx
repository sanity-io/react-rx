import {useMemo, useRef, useState} from 'react'
import {
  useObservable,
  useObservableSubject,
} from 'react-rx'
import {
  combineLatest,
  fromEvent,
  map,
  merge,
  of,
  shareReplay,
  startWith,
} from 'rxjs'

import {
  INITIAL_FETCH_STATE,
  type RequestCommand,
  resilientFetchState$,
} from './request'

function browserOnline$() {
  if (typeof window === 'undefined')
    return of(true)

  return merge(
    fromEvent(window, 'online'),
    fromEvent(window, 'offline'),
  ).pipe(
    map(() => navigator.onLine),
    startWith(navigator.onLine),
  )
}

export default function App() {
  const [latencyMs, setLatencyMs] = useState(900)
  const [fail, setFail] = useState(false)
  const [forcedOffline, setForcedOffline] =
    useState(false)
  const generation = useRef(1)
  const [refresh$, refresh] =
    useObservableSubject<RequestCommand>()
  const [offlineOverride$, setOfflineOverride] =
    useObservableSubject<boolean>()

  const actualOnline$ = useMemo(
    () =>
      browserOnline$().pipe(
        shareReplay({
          bufferSize: 1,
          refCount: true,
        }),
      ),
    [],
  )
  const effectiveOnline$ = useMemo(
    () =>
      combineLatest([
        actualOnline$,
        offlineOverride$.pipe(startWith(false)),
      ]).pipe(
        map(
          ([actualOnline, override]) =>
            actualOnline && !override,
        ),
      ),
    [actualOnline$, offlineOverride$],
  )
  const state$ = useMemo(
    () =>
      resilientFetchState$(
        refresh$,
        effectiveOnline$,
      ),
    [effectiveOnline$, refresh$],
  )

  const actualOnline = useObservable(
    actualOnline$,
    true,
  )
  const state = useObservable(
    state$,
    INITIAL_FETCH_STATE,
  )

  function runRequest() {
    generation.current += 1
    refresh({
      generation: generation.current,
      latencyMs,
      fail,
    })
  }

  return (
    <main>
      <h2>Resilient report refresh</h2>
      <p>
        This demo simulates a cancellable request
        locally so it is reliable in a sandbox.
      </p>

      <fieldset>
        <legend>Network simulation</legend>
        <label>
          Latency: {latencyMs}ms
          <input
            type="range"
            min="200"
            max="2000"
            step="100"
            value={latencyMs}
            onChange={(event) =>
              setLatencyMs(
                Number(event.currentTarget.value),
              )
            }
          />
        </label>
        <label>
          <input
            type="checkbox"
            checked={fail}
            onChange={(event) =>
              setFail(event.currentTarget.checked)
            }
          />{' '}
          Fail every attempt
        </label>
        <label>
          <input
            type="checkbox"
            checked={forcedOffline}
            onChange={(event) => {
              const offline =
                event.currentTarget.checked
              setForcedOffline(offline)
              setOfflineOverride(offline)
            }}
          />{' '}
          Simulate offline
        </label>
      </fieldset>

      <p>
        Browser:{' '}
        <strong>
          {actualOnline ? 'online' : 'offline'}
        </strong>
        {' · '}
        Request: <strong>{state.status}</strong>
        {state.status === 'refreshing'
          ? ` (attempt ${state.attempt} of 3)`
          : ''}
      </p>

      <button
        type="button"
        disabled={!actualOnline || forcedOffline}
        onClick={runRequest}
      >
        Refresh report
      </button>

      {state.error ? (
        <p role="alert">
          {state.error}. The last good report
          remains below.
        </p>
      ) : null}
      {state.status === 'offline' ? (
        <p role="status">
          Paused offline. Reconnecting restarts
          this generation from attempt 1.
        </p>
      ) : null}

      <section
        aria-busy={state.status === 'refreshing'}
      >
        <h3>Last good report</h3>
        {state.data ? (
          <>
            <p>{state.data.summary}</p>
            <small>
              Generation {state.data.generation}
            </small>
          </>
        ) : (
          <p>No successful response yet.</p>
        )}
        {state.status === 'refreshing' ? (
          <p>
            Refreshing without clearing this
            result…
          </p>
        ) : null}
      </section>

      <p>
        Try clicking refresh twice quickly:{' '}
        <code>switchMap</code>
        cancels the older timer. Retries are
        capped and use exponential backoff; errors
        become state instead of ending the refresh
        event stream.
      </p>
    </main>
  )
}

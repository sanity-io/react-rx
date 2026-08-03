import {
  useObservable,
  useSyncObservable,
} from 'react-rx'

import {
  delays,
  type Endpoint,
  requests$,
} from './api'

const ENDPOINTS: Endpoint[] = [
  '/lessons',
  '/lesson/:id/toggle',
  '/login',
]

function DelaySlider({
  endpoint,
}: {
  endpoint: Endpoint
}) {
  const delay$ = delays[endpoint]
  // The slider is a controlled input reading a BehaviorSubject.
  const delay = useSyncObservable(
    delay$,
    delay$.getValue(),
  )

  return (
    <label>
      <small>
        <code>{endpoint}</code> — {delay}ms
      </small>
      <input
        type="range"
        min={0}
        max={2000}
        step={50}
        value={delay}
        onChange={(e) =>
          delay$.next(
            Number(e.currentTarget.value),
          )
        }
      />
    </label>
  )
}

/**
 * The network debugger from the original demo, as streams: the delay knobs
 * are BehaviorSubjects the fetch layer reads, and the request log is one
 * scan over request events.
 */
export default function NetworkDebugger() {
  const requests = useObservable(requests$, [])

  return (
    <details>
      <summary>
        <small>
          Network debugger — add latency, then use
          the app
        </small>
      </summary>
      {ENDPOINTS.map((endpoint) => (
        <DelaySlider
          key={endpoint}
          endpoint={endpoint}
        />
      ))}
      {requests.length > 0 && (
        <ul className="network-log">
          {requests.map((request) => (
            <li key={request.id}>
              <small>
                <code>{request.label}</code>{' '}
                {request.done
                  ? 'done'
                  : `pending (${request.delay}ms)`}
              </small>
              <span
                className={`net-bar${request.done ? ' done' : ''}`}
              >
                <span
                  style={{
                    animationDuration: `${Math.max(request.delay, 50)}ms`,
                  }}
                />
              </span>
            </li>
          ))}
        </ul>
      )}
    </details>
  )
}

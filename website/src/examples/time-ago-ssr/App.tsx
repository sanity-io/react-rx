import {
  useEffect,
  useCallback,
  useRef,
  useState,
} from 'react'
import {
  hydrateRoot,
  type Root,
} from 'react-dom/client'
import {renderToString} from 'react-dom/server'

import {
  LiveClock,
  type ServerSnapshot,
} from './LiveClock'

function prepareServerPage() {
  const snapshot: ServerSnapshot = {
    publishedAt: Date.now() - 55_000,
    initial: {unit: 'second', value: 55},
    locale: 'en',
  }
  return {
    html: renderToString(
      <LiveClock snapshot={snapshot} />,
    ),
    payload: JSON.stringify(snapshot),
  }
}

export default function App() {
  // A real server sends both rendered HTML and these same serialized props.
  const [page] = useState(prepareServerPage)
  const hostRef = useRef<HTMLDivElement>(null)
  const rootRef = useRef<Root | null>(null)
  const [status, setStatus] = useState(
    'Server HTML only',
  )
  const [errors, setErrors] = useState<
    {id: number; message: string}[]
  >([])
  const onHydrated = useCallback(
    () => setStatus('Hydrated'),
    [],
  )

  useEffect(() => {
    return () => {
      const root = rootRef.current
      rootRef.current = null
      // Dispose the nested root after the outer root finishes its own cleanup.
      if (root)
        queueMicrotask(() => root.unmount())
    }
  }, [])

  function hydrate() {
    if (!hostRef.current || rootRef.current)
      return
    setStatus('Hydrating…')
    const snapshot = JSON.parse(
      page.payload,
    ) as ServerSnapshot
    rootRef.current = hydrateRoot(
      hostRef.current,
      <LiveClock
        snapshot={snapshot}
        onHydrated={onHydrated}
      />,
      {
        onRecoverableError(error) {
          setErrors((current) => [
            ...current,
            {
              id: current.length,
              message:
                error instanceof Error
                  ? error.message
                  : String(error),
            },
          ])
        },
      },
    )
  }

  return (
    <main>
      <h2>
        Time ago, before JavaScript takes over
      </h2>
      <p>
        This browser simulation uses React’s real
        server renderer. Wait a few seconds before
        hydrating: the HTML already shows a useful
        time.
      </p>
      <section>
        <div
          ref={hostRef}
          dangerouslySetInnerHTML={{
            __html: page.html,
          }}
        />
        <button
          type="button"
          onClick={hydrate}
          disabled={status !== 'Server HTML only'}
        >
          Hydrate
        </button>
        <p role="status">{status}</p>
        <p>
          Hydration errors captured:{' '}
          {errors.length}
        </p>
        {errors.map((error) => (
          <pre key={error.id}>
            {error.message}
          </pre>
        ))}
      </section>
      <p>
        Hydration reuses the server snapshot, not
        the client’s current time. After commit,
        the observable catches up and starts
        ticking.
      </p>
      <details>
        <summary>
          Inspect the server HTML and props
        </summary>
        <pre>{page.html}</pre>
        <pre>{page.payload}</pre>
      </details>
    </main>
  )
}

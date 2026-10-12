import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {hydrateRoot} from 'react-dom/client'
import {renderToString} from 'react-dom/server'

import {LiveClock} from './LiveClock'

export default function App() {
  // Render the clock to a string once — this is exactly what a server would send.
  const serverHtml = useMemo(
    () => renderToString(<LiveClock />),
    [],
  )
  const hostRef = useRef<HTMLDivElement>(null)
  const [status, setStatus] =
    useState('Hydrating…')

  useEffect(() => {
    const host = hostRef.current
    if (!host) {
      return
    }
    // Place the server markup, then attach React to it instead of re-creating it.
    host.innerHTML = serverHtml
    const root = hydrateRoot(host, <LiveClock />)
    setStatus(
      'Hydrated with no mismatch — now ticking live.',
    )
    return () => root.unmount()
  }, [serverHtml])

  return (
    <main>
      <h1>Server render → hydrate</h1>
      <p>
        Server HTML, generated once with{' '}
        <code>renderToString</code>. It stays
        frozen at the server value:
      </p>
      <pre>
        <code>{serverHtml}</code>
      </pre>
      <p>
        The same markup after{' '}
        <code>hydrateRoot</code> attaches and the
        timer starts:
      </p>
      <div ref={hostRef} />
      <p>
        <small>{status}</small>
      </p>
    </main>
  )
}

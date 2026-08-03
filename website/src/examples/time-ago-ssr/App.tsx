import {useEffect, useRef, useState} from 'react'
import {
  hydrateRoot,
  type Root,
} from 'react-dom/client'
import {renderToString} from 'react-dom/server'

import {Message, type Payload} from './Message'

function makePayload(): Payload {
  return {
    text: 'Deploy finished',
    sentAt: Date.now() - 55_000,
    serverNow: Date.now(),
  }
}

/**
 * A self-contained SSR simulation: render the message to an HTML string with
 * react-dom/server, show that static HTML for a while ("the JS bundle is
 * still downloading"), then hydrate it — and count hydration mismatches.
 */
export default function App() {
  const containerRef =
    useRef<HTMLDivElement>(null)
  const [phase, setPhase] = useState<
    'server-html' | 'hydrated'
  >('server-html')
  const [mismatches, setMismatches] = useState<
    string[]
  >([])

  // What the server would serialize next to the HTML: the message and the
  // server's clock at render time.
  const [payload, setPayload] =
    useState<Payload>(makePayload)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    // 1. "Server": render the HTML and ship it with the payload.
    setPhase('server-html')
    setMismatches([])
    el.innerHTML = renderToString(
      <Message {...payload} />,
    )

    // 2. Simulate a slow network: hydrate three seconds later. The label is
    //    already correct in the static HTML the whole time.
    let root: Root | undefined
    const id = setTimeout(() => {
      root = hydrateRoot(
        el,
        <Message {...payload} />,
        {
          onRecoverableError: (error) =>
            setMismatches((all) => [
              ...all,
              String(error),
            ]),
        },
      )
      setPhase('hydrated')
    }, 3000)

    return () => {
      clearTimeout(id)
      root?.unmount()
      el.innerHTML = ''
    }
  }, [payload])

  return (
    <>
      <p>
        {phase === 'server-html' ? (
          <mark>
            Static server HTML — JS still
            “downloading”…
          </mark>
        ) : (
          <ins>
            Hydrated — the label is live now
          </ins>
        )}
      </p>
      <p>
        Hydration mismatches:{' '}
        <strong>
          {mismatches.length === 0
            ? 'none'
            : mismatches.length}
        </strong>
      </p>
      <div ref={containerRef} />
      <p>
        <button
          type="button"
          onClick={() =>
            setPayload(makePayload())
          }
        >
          Run the simulation again
        </button>
      </p>
      <hr />
      <small>
        Payload serialized by the “server”:
      </small>
      <pre>
        {JSON.stringify(payload, null, 2)}
      </pre>
    </>
  )
}

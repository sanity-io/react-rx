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
 * still downloading"), then hydrate it and count hydration mismatches.
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
  // server's clock at render time. Each rerun is a fresh "request" with its
  // own id, and the container below is keyed by that id so every run renders
  // into its own element.
  const [run, setRun] = useState(() => ({
    id: 1,
    payload: makePayload(),
  }))
  const {payload} = run

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
      // This cleanup runs while React is committing the rerun, and a root
      // must not be unmounted synchronously mid-render. Defer it by one
      // microtask. By then the keyed container has been swapped out, so the
      // unmount tears down this run's tree (and its subscriptions) on the
      // detached element without touching the static HTML on screen.
      queueMicrotask(() => root?.unmount())
    }
  }, [payload])

  return (
    <>
      <p>
        {phase === 'server-html' ? (
          <mark>
            Static server HTML. JS still
            “downloading”…
          </mark>
        ) : (
          <ins>
            Hydrated. The label is live now
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
      {/* Keyed per run: a rerun swaps in a fresh container element, so the
          previous run's root unmounts against the old, detached one and can
          never wipe the static HTML of the run that is on screen. */}
      <div key={run.id} ref={containerRef} />
      <p>
        <button
          type="button"
          onClick={() =>
            setRun((prev) => ({
              id: prev.id + 1,
              payload: makePayload(),
            }))
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

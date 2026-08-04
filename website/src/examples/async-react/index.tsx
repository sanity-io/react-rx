'use client'

import {useState} from 'react'

const BASE = '/async-react-demo'

/**
 * The async-react demo is a real Vite app (the `async-react/` workspace, with React
 * experimental, Tailwind, and ViewTransition), so it can't run inside the Sandpack bundler.
 * The website builds the workspace app and embeds it here instead.
 */
export default function Example() {
  const [view, setView] = useState<
    'lessons' | 'login'
  >('lessons')

  return (
    <figure style={{margin: '1.5rem 0'}}>
      <div
        style={{
          display: 'flex',
          gap: 8,
          alignItems: 'center',
          marginBottom: 8,
        }}
      >
        <button
          type="button"
          onClick={() => setView('lessons')}
          style={{
            fontWeight:
              view === 'lessons' ? 700 : 400,
          }}
        >
          Lessons
        </button>
        <button
          type="button"
          onClick={() => setView('login')}
          style={{
            fontWeight:
              view === 'login' ? 700 : 400,
          }}
        >
          Login flow
        </button>
        <a
          href={`${BASE}/index.html`}
          target="_blank"
          rel="noreferrer"
          style={{
            marginLeft: 'auto',
            fontSize: 14,
          }}
        >
          Open full size
        </a>
      </div>
      {/* oxlint-disable-next-line react/iframe-missing-sandbox -- first-party
          app built from this repo's async-react workspace; it needs scripts
          and same-origin storage, so a sandbox attribute would only break it */}
      <iframe
        key={view}
        src={
          view === 'lessons'
            ? `${BASE}/index.html`
            : `${BASE}/login`
        }
        title="Async React demo (react-rx fork)"
        style={{
          width: '100%',
          height: 700,
          border:
            '1px solid rgba(127, 127, 127, 0.35)',
          borderRadius: 8,
          background: '#000',
        }}
      />
      <figcaption
        style={{
          fontSize: 14,
          opacity: 0.75,
          marginTop: 8,
        }}
      >
        The embedded app is built from the repo's{' '}
        <a
          href="https://github.com/sanity-io/react-rx/tree/current/async-react"
          target="_blank"
          rel="noreferrer"
        >
          async-react workspace
        </a>
        , a fork of{' '}
        <a
          href="https://github.com/rickhanlonii/async-react"
          target="_blank"
          rel="noreferrer"
        >
          rickhanlonii/async-react
        </a>{' '}
        migrated to react-rx.
      </figcaption>
    </figure>
  )
}

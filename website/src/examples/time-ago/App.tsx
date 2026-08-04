import {useMemo, useRef, useState} from 'react'
import {useObservable} from 'react-rx'

import {
  timeAgoParts$,
  toTimeAgoParts,
} from './timeAgo'

// Formatting lives in the component, not in the stream.
const rtf = new Intl.RelativeTimeFormat('en', {
  numeric: 'auto',
})

function TimeAgo({sentAt}: {sentAt: number}) {
  // Memoize the stream AND the initial value together. The initial value is
  // read on every snapshot check until the stream's first (async) emission,
  // so it must stay referentially stable. A fresh object per read would
  // loop useSyncExternalStore.
  const [parts$, initialParts] = useMemo(
    () =>
      [
        timeAgoParts$(sentAt),
        toTimeAgoParts(Date.now() - sentAt),
      ] as const,
    [sentAt],
  )
  const parts = useObservable(
    parts$,
    initialParts,
  )

  // Visible proof of how often React re-renders this label.
  const renders = useRef(0)
  renders.current += 1

  return (
    <small>
      {rtf.format(parts.value, parts.unit)} ·
      rendered {renders.current}×
    </small>
  )
}

function makeMessages(now: number) {
  return [
    {
      id: `${now}-1`,
      text: 'Just posted (re-renders every second)',
      sentAt: now - 3_000,
    },
    {
      id: `${now}-2`,
      text: 'About to turn a minute old (then goes quiet)',
      sentAt: now - 52_000,
    },
    {
      id: `${now}-3`,
      text: 'Minutes old (re-renders once a minute)',
      sentAt: now - 4.5 * 60_000,
    },
  ]
}

export default function App() {
  const [messages, setMessages] = useState(() =>
    makeMessages(Date.now()),
  )

  return (
    <>
      {messages.map((message) => (
        <article key={message.id}>
          <p>{message.text}</p>
          <TimeAgo sentAt={message.sentAt} />
        </article>
      ))}
      <button
        type="button"
        onClick={() =>
          setMessages(makeMessages(Date.now()))
        }
      >
        Restart demo
      </button>
    </>
  )
}

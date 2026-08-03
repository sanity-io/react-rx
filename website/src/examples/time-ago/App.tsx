import {useMemo, useRef} from 'react'
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
  const parts$ = useMemo(
    () => timeAgoParts$(sentAt),
    [sentAt],
  )
  const parts = useObservable(parts$, () =>
    toTimeAgoParts(Date.now() - sentAt),
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

const NOW = Date.now()
const MESSAGES = [
  {
    id: 1,
    text: 'Just posted — re-renders every second',
    sentAt: NOW - 3_000,
  },
  {
    id: 2,
    text: 'About to turn a minute old — then goes quiet',
    sentAt: NOW - 52_000,
  },
  {
    id: 3,
    text: 'Minutes old — re-renders once a minute',
    sentAt: NOW - 4.5 * 60_000,
  },
]

export default function App() {
  return (
    <>
      {MESSAGES.map((message) => (
        <article key={message.id}>
          <p>{message.text}</p>
          <TimeAgo sentAt={message.sentAt} />
        </article>
      ))}
    </>
  )
}

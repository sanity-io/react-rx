import {useMemo, useState} from 'react'
import {useObservable} from 'react-rx'

import {
  timeAgoParts$,
  toTimeAgoParts,
} from './timeAgo'

// Formatting lives in the component, not in the stream.
const rtf = new Intl.RelativeTimeFormat('en', {
  numeric: 'auto',
})

function TimeAgo({
  sentAt,
  age,
}: {
  sentAt: number
  age: number
}) {
  const parts$ = useMemo(
    () => timeAgoParts$(sentAt),
    [sentAt],
  )
  // Rendered until the clock's first tick. Derived from the message's known
  // age, so it stays pure and stable across renders.
  const initialState = useMemo(
    () => ({...toTimeAgoParts(age), updates: 0}),
    [age],
  )
  const state = useObservable(
    parts$,
    initialState,
  )

  // One emission is one re-render, so this is visible proof of how often
  // the stream wakes React up.
  return (
    <small>
      {rtf.format(state.value, state.unit)} ·
      updated {state.updates}×
    </small>
  )
}

const MESSAGES = [
  {
    text: 'Just posted (updates every second)',
    age: 3_000,
  },
  {
    text: 'About to turn a minute old (then goes quiet)',
    age: 52_000,
  },
  {
    text: 'Minutes old (updates once a minute)',
    age: 4.5 * 60_000,
  },
]

function makeMessages(now: number) {
  return MESSAGES.map((message, index) => ({
    id: `${now}-${index}`,
    text: message.text,
    age: message.age,
    sentAt: now - message.age,
  }))
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
          <TimeAgo
            sentAt={message.sentAt}
            age={message.age}
          />
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

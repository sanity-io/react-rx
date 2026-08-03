import {useObservable} from 'react-rx'
import {
  map,
  scan,
  startWith,
  Subject,
  timer,
} from 'rxjs'

interface Message {
  id: number
  author: string
  text: string
  sentAt: number
}

// One shared clock for the whole app. Every <Timestamp> below reads this
// same observable, and react-rx shares a single underlying subscription —
// one interval, no matter how many labels are on screen.
const now$ = timer(0, 1000).pipe(
  map(() => Date.now()),
)

function formatAgo(
  sentAt: number,
  now: number,
): string {
  const seconds = Math.max(
    0,
    Math.floor((now - sentAt) / 1000),
  )
  if (seconds < 5) return 'just now'
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  return `${Math.floor(minutes / 60)}h ago`
}

function Timestamp({sentAt}: {sentAt: number}) {
  const now = useObservable(now$, () =>
    Date.now(),
  )
  return <small>{formatAgo(sentAt, now)}</small>
}

const SEED: Message[] = [
  {
    id: 1,
    author: 'Ada',
    text: 'Deploy is out',
    sentAt: Date.now() - 95_000,
  },
  {
    id: 2,
    author: 'Grace',
    text: 'Dashboards look healthy',
    sentAt: Date.now() - 42_000,
  },
  {
    id: 3,
    author: 'Ada',
    text: 'Closing the incident',
    sentAt: Date.now() - 7_000,
  },
]

// New messages push into a Subject; the list accumulates with scan.
const newMessage$ = new Subject<Message>()
const messages$ = newMessage$.pipe(
  scan((all, message) => [...all, message], SEED),
  startWith(SEED),
)

function post() {
  newMessage$.next({
    id: Date.now(),
    author: 'You',
    text: 'Posted from the button below',
    sentAt: Date.now(),
  })
}

export default function App() {
  const messages = useObservable(messages$, SEED)

  return (
    <>
      {messages.map((message) => (
        <article key={message.id}>
          <strong>{message.author}</strong>{' '}
          <Timestamp sentAt={message.sentAt} />
          <p>{message.text}</p>
        </article>
      ))}
      <button type="button" onClick={post}>
        Post a message
      </button>
    </>
  )
}

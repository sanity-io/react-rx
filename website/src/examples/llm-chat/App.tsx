import {
  Activity,
  Suspense,
  use,
  useState,
} from 'react'
import {
  preloadObservablePromise,
  useObservablePromise,
} from 'react-rx'

import {
  CHATS,
  conversation$,
  type Chat,
} from './chat'

function ChatView({chat}: {chat: Chat}) {
  // Suspends until the first token, then streams in place — later emissions
  // never re-trigger the Suspense fallback.
  const messages = use(
    useObservablePromise(conversation$(chat)),
  )

  return (
    <div>
      {messages.map((message) =>
        message.role === 'user' ? (
          <p key="user">
            <strong>You:</strong>{' '}
            {message.content}
          </p>
        ) : (
          <blockquote key="assistant">
            {message.content}
          </blockquote>
        ),
      )}
    </div>
  )
}

export default function App() {
  const [activeId, setActiveId] = useState(
    CHATS[0].id,
  )
  const [visitedIds, setVisitedIds] = useState([
    CHATS[0].id,
  ])

  const open = (chat: Chat) => {
    setActiveId(chat.id)
    setVisitedIds((ids) =>
      ids.includes(chat.id)
        ? ids
        : [...ids, chat.id],
    )
  }

  return (
    <>
      <div role="group">
        {CHATS.map((chat) => (
          <button
            key={chat.id}
            type="button"
            // Hovering a chat you haven't opened yet starts its reply
            // streaming in the background, so opening it skips the fallback.
            onMouseEnter={() =>
              preloadObservablePromise(
                conversation$(chat),
                {ttl: 30_000},
              )
            }
            onClick={() => open(chat)}
            aria-current={
              chat.id === activeId || undefined
            }
            style={{
              fontWeight:
                chat.id === activeId ? 700 : 400,
            }}
          >
            {chat.title}
          </button>
        ))}
      </div>

      <Suspense
        fallback={
          <p aria-busy="true">
            Waiting for the first token…
          </p>
        }
      >
        {CHATS.filter((chat) =>
          visitedIds.includes(chat.id),
        ).map((chat) => (
          // Visited chats stay mounted but hidden: they keep their state and
          // reveal instantly — including every token that streamed while you
          // were looking at another chat.
          <Activity
            key={chat.id}
            mode={
              chat.id === activeId
                ? 'visible'
                : 'hidden'
            }
          >
            <ChatView chat={chat} />
          </Activity>
        ))}
      </Suspense>
    </>
  )
}

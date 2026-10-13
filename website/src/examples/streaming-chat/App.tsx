import {
  Activity,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  useObservable,
  useObservableSubject,
} from 'react-rx'

import Conversation from './Conversation'
import {
  chatState$,
  type ChatCommand,
  INITIAL_CHAT_STATE,
  ROOMS,
  type RoomId,
} from './stream'

const INITIAL_PROMPTS: Record<RoomId, string> = {
  incident: 'Summarize the recovery plan',
  release: 'How should we roll this out?',
  research: 'What should we test next?',
}

export default function App() {
  const [activeRoom, setActiveRoom] =
    useState<RoomId>('incident')
  const [prompts, setPrompts] = useState(
    INITIAL_PROMPTS,
  )
  const [simulateFailure, setSimulateFailure] =
    useState(false)
  const runId = useRef(0)
  const [commands$, sendCommand] =
    useObservableSubject<ChatCommand>()
  const conversations$ = useMemo(
    () => chatState$(commands$),
    [commands$],
  )

  // This visible owner remains subscribed while Activity hides a room.
  const conversations = useObservable(
    conversations$,
    INITIAL_CHAT_STATE,
  )

  function start(roomId: RoomId) {
    runId.current += 1
    sendCommand({
      type: 'start',
      roomId,
      runId: runId.current,
      prompt: prompts[roomId],
      ...(simulateFailure
        ? {failAtToken: 5}
        : {}),
    })
  }

  return (
    <main>
      <h2>Streaming support rooms</h2>
      <p>
        Replies are deterministic local
        simulations—no API key or network request
        is used.
      </p>

      <nav aria-label="Conversations">
        {ROOMS.map((room) => (
          <button
            key={room.id}
            type="button"
            aria-pressed={activeRoom === room.id}
            onClick={() => setActiveRoom(room.id)}
          >
            {room.label}
            {conversations[room.id].status ===
            'streaming'
              ? ' •'
              : ''}
          </button>
        ))}
      </nav>

      <label>
        <input
          type="checkbox"
          checked={simulateFailure}
          onChange={(event) =>
            setSimulateFailure(
              event.currentTarget.checked,
            )
          }
        />{' '}
        Interrupt the next stream
      </label>

      {ROOMS.map((room) => (
        <Activity
          key={room.id}
          mode={
            activeRoom === room.id
              ? 'visible'
              : 'hidden'
          }
        >
          <Conversation
            room={conversations[room.id]}
            prompt={prompts[room.id]}
            fail={simulateFailure}
            onPromptChange={(prompt) =>
              setPrompts((current) => ({
                ...current,
                [room.id]: prompt,
              }))
            }
            onStart={() => start(room.id)}
            onStop={() =>
              sendCommand({
                type: 'stop',
                roomId: room.id,
              })
            }
            onClear={() =>
              sendCommand({
                type: 'clear',
                roomId: room.id,
              })
            }
          />
        </Activity>
      ))}

      <aside>
        Switch rooms during a reply. The stream
        continues because this always-visible
        parent owns the subscription; hidden
        Activity children only render the latest
        plain state.
      </aside>
    </main>
  )
}

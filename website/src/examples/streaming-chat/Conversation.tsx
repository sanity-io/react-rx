import {type RoomState} from './stream'

export default function Conversation({
  room,
  prompt,
  fail,
  onPromptChange,
  onStart,
  onStop,
  onClear,
}: {
  room: RoomState
  prompt: string
  fail: boolean
  onPromptChange: (value: string) => void
  onStart: () => void
  onStop: () => void
  onClear: () => void
}) {
  return (
    <section aria-live="polite">
      <div>
        {room.messages.length === 0 ? (
          <p>
            No messages yet. Start this
            conversation.
          </p>
        ) : (
          room.messages.map((message) => (
            <article key={message.id}>
              <strong>
                {message.role === 'user'
                  ? 'You'
                  : 'Assistant'}
              </strong>
              <p>
                {message.text ||
                  (room.status === 'streaming'
                    ? '…'
                    : '')}
              </p>
            </article>
          ))
        )}
      </div>

      <p>
        Status: <strong>{room.status}</strong>
        {room.error ? (
          <span role="alert">
            {' '}
            — {room.error}
          </span>
        ) : null}
      </p>

      <label>
        Message
        <input
          value={prompt}
          onChange={(event) =>
            onPromptChange(
              event.currentTarget.value,
            )
          }
        />
      </label>
      <div>
        <button type="button" onClick={onStart}>
          {room.status === 'streaming'
            ? 'Restart'
            : 'Start'}
        </button>
        <button
          type="button"
          disabled={room.status !== 'streaming'}
          onClick={onStop}
        >
          Stop
        </button>
        <button type="button" onClick={onClear}>
          Clear room
        </button>
      </div>
      {fail ? (
        <small>
          The next run will fail after a few
          tokens.
        </small>
      ) : null}
    </section>
  )
}

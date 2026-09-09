import {
  useObservableSubject,
  useSyncObservable,
} from 'react-rx'

export default function App() {
  // useObservableSubject owns a Subject for this
  // component and hands back a stable push handler.
  const [text$, setText] =
    useObservableSubject<string>()
  // Controlled inputs read useSyncObservable. The value must update
  // synchronously to keep the caret and IME composition intact.
  const text = useSyncObservable(text$, 'hello')

  return (
    <>
      <input
        value={text}
        onChange={(event) =>
          setText(event.currentTarget.value)
        }
      />
      <p>You typed: {text}</p>
      <button
        type="button"
        onClick={() => setText('hello')}
      >
        Reset
      </button>
    </>
  )
}

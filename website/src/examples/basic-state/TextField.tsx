import {
  useObservableSubject,
  useSyncObservable,
} from 'react-rx'

export default function TextField() {
  const [text$, setText] =
    useObservableSubject<string>()
  const text = useSyncObservable(text$, '')

  return (
    <fieldset>
      <legend>1. A text field</legend>
      <label>
        Your name
        <input
          value={text}
          onChange={(event) =>
            setText(event.currentTarget.value)
          }
        />
      </label>
      <p>Hello, {text || 'stranger'}.</p>
    </fieldset>
  )
}

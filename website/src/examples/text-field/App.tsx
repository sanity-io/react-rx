import {useState} from 'react'
import {useSyncObservable} from 'react-rx'
import {Subject} from 'rxjs'

export default function App() {
  const [text$] = useState(
    () => new Subject<string>(),
  )
  // Controlled inputs read useSyncObservable. The value must update
  // synchronously to keep the caret and IME composition intact.
  const text = useSyncObservable(text$, 'hello')

  return (
    <>
      <input
        value={text}
        onChange={(e) =>
          text$.next(e.currentTarget.value)
        }
      />
      <p>You typed: {text}</p>
      <button
        type="button"
        onClick={() => text$.next('hello')}
      >
        Reset
      </button>
    </>
  )
}

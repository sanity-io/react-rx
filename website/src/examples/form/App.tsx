import {useState} from 'react'
import {
  useObservable,
  useSyncObservable,
} from 'react-rx'
import {BehaviorSubject} from 'rxjs'

export default function App() {
  const [name$] = useState(
    () => new BehaviorSubject('Taylor'),
  )
  const [age$] = useState(
    () => new BehaviorSubject(42),
  )

  // The text input is controlled — synchronous updates.
  const name = useSyncObservable(
    name$,
    name$.getValue(),
  )
  // Age only feeds rendering — the deferred default is fine.
  const age = useObservable(age$, age$.getValue())

  return (
    <>
      <input
        value={name}
        onChange={(e) =>
          name$.next(e.currentTarget.value)
        }
      />
      <button
        type="button"
        onClick={() =>
          age$.next(age$.getValue() + 1)
        }
      >
        Increment age
      </button>
      <p>
        Hello, {name}. You are {age}.
      </p>
    </>
  )
}

import {type FormEvent} from 'react'
import {useObservable, useSyncObservable} from 'react-rx'
import {filter, map, scan, startWith, Subject, withLatestFrom} from 'rxjs'

interface TodoItem {
  id: number
  text: string
}

// Events push into Subjects…
const text$ = new Subject<string>()
const submit$ = new Subject<void>()

// …and the list derives from them: every submit samples the latest text.
const items$ = submit$.pipe(
  withLatestFrom(text$),
  map(([, text]) => text.trim()),
  filter((text) => text.length > 0),
  map((text) => ({text, id: Date.now()})),
  scan((items: TodoItem[], item) => items.concat(item), []),
  startWith([] as TodoItem[]),
)

function TodoApp() {
  // Controlled input value must update synchronously to avoid caret/IME issues.
  const text = useSyncObservable(text$, '')
  const items = useObservable(items$, [])

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    submit$.next()
    text$.next('')
  }

  return (
    <>
      <h4>TODO</h4>
      <ul>
        {items.map((item) => (
          <li key={item.id}>{item.text}</li>
        ))}
      </ul>
      <form onSubmit={handleSubmit}>
        <label htmlFor="new-todo">What needs to be done?</label>
        <input id="new-todo" value={text} onChange={(e) => text$.next(e.currentTarget.value)} />
        <button>Add #{items.length + 1}</button>
      </form>
    </>
  )
}

export default function App() {
  return <TodoApp />
}

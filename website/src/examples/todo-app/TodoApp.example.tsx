import {
  ChangeEvent,
  type SyntheticEvent,
  useMemo,
} from 'react'
import {
  useObservable,
  useObservableEvent,
  useSyncObservable,
} from 'react-rx'
import {
  filter,
  map,
  scan,
  startWith,
  Subject,
  tap,
  withLatestFrom,
} from 'rxjs'
import {styled} from 'styled-components'

interface TodoItem {
  id: number
  text: string
}

const text$ = new Subject<string>()
const submit$ = new Subject<
  SyntheticEvent<HTMLFormElement>
>()
const textToItem = (text: string) => ({
  text,
  id: Date.now(),
})

function TodoApp() {
  // Handle input changes
  const handleInput = useObservableEvent<
    ChangeEvent<HTMLInputElement>,
    any
  >((input$) =>
    input$.pipe(
      map(
        (e: ChangeEvent<HTMLInputElement>) =>
          e.currentTarget.value,
      ),
      tap((value) => text$.next(value)),
    ),
  )

  // Handle form submissions
  const handleSubmit = useObservableEvent<
    SyntheticEvent<HTMLFormElement>,
    any
  >((event$) =>
    event$.pipe(
      tap((e) => {
        e.preventDefault()
        submit$.next(e)
        text$.next('')
      }),
    ),
  )

  // Create items stream
  const items$ = useMemo(
    () =>
      submit$.pipe(
        withLatestFrom(text$),
        map(([, text]) => text),
        filter((text) => text.length > 0),
        map(textToItem),
        scan(
          (items: TodoItem[], item) =>
            items.concat(item),
          [] as TodoItem[],
        ),
        startWith([]),
      ),
    [],
  )

  // Controlled input value must update synchronously to avoid caret/IME issues.
  const text = useSyncObservable(text$, '')
  const items = useObservable(items$, [])

  return (
    <Wrapper>
      <h3>TODO</h3>
      <TodoList items={items} />
      <form onSubmit={handleSubmit}>
        <label htmlFor="new-todo">
          What needs to be done?
        </label>
        <input
          id="new-todo"
          onChange={handleInput}
          value={text}
        />
        <button>Add #{items.length + 1}</button>
      </form>
    </Wrapper>
  )
}

interface ListProps {
  items: TodoItem[]
}

function TodoList(props: ListProps) {
  return (
    <ul>
      {props.items.map((item) => (
        <li key={item.id}>{item.text}</li>
      ))}
    </ul>
  )
}

const Wrapper = styled.div`
  label {
    display: block;
    margin-top: 10px;
  }
  input {
    box-sizing: border-box;
    width: 100%;
    padding: 5px;
  }
`

export default function App() {
  return <TodoApp />
}

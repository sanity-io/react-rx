import {ChangeEvent, FormEvent} from 'react'
import {
  combineLatest,
  reactiveComponent,
  filter,
  map,
  mapTo,
  merge,
  React,
  ReactDOM,
  scan,
  startWith,
  tap,
  useEvent,
  withLatestFrom
} from '../_utils/globalScope'
//@endimport

interface TodoItem {
  id: number
  text: string
}
const TodoApp = reactiveComponent(() => {
  const [onInput$, handleInput] = useEvent<ChangeEvent<HTMLInputElement>>()
  const [onSubmit$, handleSubmit] = useEvent<FormEvent<HTMLFormElement>>()

  const text$ = onInput$.pipe(
    map(e => e.currentTarget.value),
    startWith('')
  )

  const items$ = onSubmit$.pipe(
    tap(e => e.preventDefault()),
    withLatestFrom(text$),
    map(([_, text]) => text),
    filter(text => text.length > 0),
    map(text => ({text, id: Date.now()})),
    scan((items: TodoItem[], item) => items.concat(item), []),
    startWith([])
  )

  const inputValue$ = merge(text$, onSubmit$.pipe(mapTo('')))

  return combineLatest([inputValue$, items$]).pipe(
    map(([text, items]) => (
      <div>
        <h3>TODO</h3>
        <TodoList items={items} />
        <form onSubmit={handleSubmit}>
          <label htmlFor="new-todo">What needs to be done?</label>
          <input id="new-todo" onChange={handleInput} value={text} />
          <button>Add #{items.length + 1}</button>
        </form>
      </div>
    ))
  )
})

interface ListProps {
  items: TodoItem[]
}
function TodoList(props: ListProps) {
  return (
    <ul>
      {props.items.map(item => (
        <li key={item.id}>{item.text}</li>
      ))}
    </ul>
  )
}

ReactDOM.render(<TodoApp />, document.getElementById('todo-app'))

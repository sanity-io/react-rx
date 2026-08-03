import {useObservable} from 'react-rx'
import {
  map,
  scan,
  Subject,
  throttleTime,
} from 'rxjs'

const clicks$ = new Subject<{clientX: number}>()
// Transform the values flowing through: push the whole click event, pluck
// the pointer's x position in the pipe, and sum the positions with scan.
const total$ = clicks$.pipe(
  throttleTime(1000),
  map((event) => event.clientX),
  scan((sum, clientX) => sum + clientX, 0),
)

export default function App() {
  const total = useObservable(total$, 0)

  return (
    <>
      <button
        type="button"
        onClick={(event) => clicks$.next(event)}
      >
        Click me (anywhere on the button)
      </button>
      <p>Sum of x positions: {total}</p>
    </>
  )
}

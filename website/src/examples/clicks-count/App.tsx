import {useObservable} from 'react-rx'
import {scan, Subject} from 'rxjs'

// The same two streams…
const clicks$ = new Subject<void>()
const count$ = clicks$.pipe(
  scan((count) => count + 1, 0),
)

// …and the whole bridge is one hook: subscription, initial value and
// teardown are owned by useObservable.
export default function App() {
  const count = useObservable(count$, 0)

  return (
    <button
      type="button"
      onClick={() => clicks$.next()}
    >
      Clicked {count} times
    </button>
  )
}

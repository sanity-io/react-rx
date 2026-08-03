import {useObservable} from 'react-rx'
import {scan, Subject, throttleTime} from 'rxjs'

const clicks$ = new Subject<void>()
// Controlling the flow of events is one operator: click as fast as you
// like — at most one click per second makes it into the count.
const count$ = clicks$.pipe(
  throttleTime(1000),
  scan((count) => count + 1, 0),
)

export default function App() {
  const count = useObservable(count$, 0)

  return (
    <>
      <button
        type="button"
        onClick={() => clicks$.next()}
      >
        Click as fast as you can
      </button>
      <p>
        Counted {count} (at most one per second)
      </p>
    </>
  )
}

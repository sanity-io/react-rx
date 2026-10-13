import {useMemo} from 'react'
import {
  useObservable,
  useObservableSubject,
} from 'react-rx'
import {
  map,
  type Observable,
  scan,
  throttleTime,
} from 'rxjs'

import ManualCounter from './ManualCounter'
import ReactRxCounter from './ReactRxCounter'

// Flow control: throttleTime drops clicks that arrive within one second of the
// last counted one, so the stream emits fewer values than were clicked.
function ThrottledCount({
  clicks$,
}: {
  clicks$: Observable<unknown>
}) {
  const total$ = useMemo(
    () =>
      clicks$.pipe(
        throttleTime(1000),
        scan((total) => total + 1, 0),
      ),
    [clicks$],
  )
  const count = useObservable(total$, 0)
  return <li>Throttled to 1/sec: {count}</li>
}

// Value transformation: map turns the count into a render-ready label.
function Parity({
  clicks$,
}: {
  clicks$: Observable<unknown>
}) {
  const label$ = useMemo(
    () =>
      clicks$.pipe(
        scan((total) => total + 1, 0),
        map((total) =>
          total % 2 === 0 ? 'even' : 'odd',
        ),
      ),
    [clicks$],
  )
  const label = useObservable(label$, 'even')
  return <li>Mapped to parity: {label}</li>
}

export default function App() {
  const [clicks$, handleClick] =
    useObservableSubject<void>()
  return (
    <main>
      <section>
        <h2>1. React + RxJS</h2>
        <ManualCounter />
      </section>
      <section>
        <h2>2. With react-rx</h2>
        <ReactRxCounter />
      </section>
      <section>
        <h2>
          3. Control the flow and transform values
        </h2>
        <button
          type="button"
          onClick={() => handleClick()}
        >
          Click quickly
        </button>
        <ul>
          <ThrottledCount clicks$={clicks$} />
          <Parity clicks$={clicks$} />
        </ul>
      </section>
    </main>
  )
}

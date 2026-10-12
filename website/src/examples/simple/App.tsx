import {useEffect, useMemo, useState} from 'react'
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

// Manual integration: a subscription wired by hand with useEffect + useState.
// This is the boilerplate react-rx exists to remove.
function ManualCount({
  clicks$,
}: {
  clicks$: Observable<unknown>
}) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    const subscription = clicks$
      .pipe(scan((total) => total + 1, 0))
      .subscribe(setCount)
    return () => subscription.unsubscribe()
  }, [clicks$])
  return <li>Manual useEffect: {count}</li>
}

// react-rx: the same scan, read as a value. No effect, no setter.
function ReactRxCount({
  clicks$,
}: {
  clicks$: Observable<unknown>
}) {
  const total$ = useMemo(
    () =>
      clicks$.pipe(scan((total) => total + 1, 0)),
    [clicks$],
  )
  const count = useObservable(total$, 0)
  return <li>react-rx useObservable: {count}</li>
}

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
      <p>
        <button
          type="button"
          onClick={() => handleClick()}
        >
          Click me
        </button>
      </p>
      <ul>
        <ManualCount clicks$={clicks$} />
        <ReactRxCount clicks$={clicks$} />
        <ThrottledCount clicks$={clicks$} />
        <Parity clicks$={clicks$} />
      </ul>
    </main>
  )
}

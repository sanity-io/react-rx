import {useMemo, useState} from 'react'
import {useObservable} from 'react-rx'
import {scan, Subject} from 'rxjs'

// With react-rx the hook owns the subscription, the initial value and the
// teardown. The count state lives in the stream (scan), not in a variable.
export default function App() {
  const [clicks$] = useState(
    () => new Subject<void>(),
  )
  const count$ = useMemo(
    () =>
      clicks$.pipe(scan((count) => count + 1, 0)),
    [clicks$],
  )
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

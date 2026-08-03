import {useEffect, useMemo, useState} from 'react'
import {scan, Subject} from 'rxjs'

// Without react-rx you own the whole bridge: the subscription, a mirrored
// piece of useState, and the teardown.
export default function App() {
  const [clicks$] = useState(
    () => new Subject<void>(),
  )
  const count$ = useMemo(
    () =>
      clicks$.pipe(scan((count) => count + 1, 0)),
    [clicks$],
  )

  const [count, setCount] = useState(0)
  useEffect(() => {
    const subscription =
      count$.subscribe(setCount)
    return () => subscription.unsubscribe()
  }, [count$])

  return (
    <button
      type="button"
      onClick={() => clicks$.next()}
    >
      Clicked {count} times
    </button>
  )
}

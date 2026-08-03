import {useEffect, useState} from 'react'
import {scan, Subject} from 'rxjs'

// Clicks push into a Subject; the count lives in the stream — scan works
// like reduce for arrays.
const clicks$ = new Subject<void>()
const count$ = clicks$.pipe(
  scan((count) => count + 1, 0),
)

// Without react-rx you own the whole bridge: the subscription, a mirrored
// piece of useState, and the teardown.
export default function App() {
  const [count, setCount] = useState(0)

  useEffect(() => {
    const subscription =
      count$.subscribe(setCount)
    return () => subscription.unsubscribe()
  }, [])

  return (
    <button
      type="button"
      onClick={() => clicks$.next()}
    >
      Clicked {count} times
    </button>
  )
}

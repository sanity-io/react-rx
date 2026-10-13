import {useEffect, useState} from 'react'
import {scan, Subject} from 'rxjs'

export default function ManualCounter() {
  const [clicks$] = useState(
    () => new Subject<void>(),
  )
  const [count, setCount] = useState(0)

  useEffect(() => {
    const subscription = clicks$
      .pipe(scan((total) => total + 1, 0))
      .subscribe(setCount)
    return () => subscription.unsubscribe()
  }, [clicks$])

  return (
    <button
      type="button"
      onClick={() => clicks$.next()}
    >
      React + RxJS: {count} clicks
    </button>
  )
}

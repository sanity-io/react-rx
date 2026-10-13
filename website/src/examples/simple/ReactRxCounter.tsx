import {useMemo} from 'react'
import {
  useObservable,
  useObservableSubject,
} from 'react-rx'
import {scan} from 'rxjs'

export default function ReactRxCounter() {
  const [clicks$, click] =
    useObservableSubject<void>()
  const count$ = useMemo(
    () =>
      clicks$.pipe(scan((total) => total + 1, 0)),
    [clicks$],
  )
  const count = useObservable(count$, 0)

  return (
    <button type="button" onClick={() => click()}>
      react-rx: {count} clicks
    </button>
  )
}

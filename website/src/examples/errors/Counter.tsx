import {useMemo} from 'react'
import {useObservable} from 'react-rx'
import {timer} from 'rxjs'

export function Counter() {
  const observable = useMemo(
    () => timer(0, 1000),
    [],
  )
  const count = useObservable(observable, 0)
  return <>{count}s</>
}

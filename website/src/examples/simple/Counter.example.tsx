import {useMemo} from 'react'
import {useObservable} from 'react-rx'
import {timer} from 'rxjs'

export default function App() {
  const observable = useMemo(
    () => timer(0, 1000),
    [],
  )
  const seconds =
    useObservable(observable)
  return <>Seconds: {seconds}</>
}

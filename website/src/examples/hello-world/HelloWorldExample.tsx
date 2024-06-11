import {useMemo} from 'react'
import {useObservable} from 'react-rx'
import {of} from 'rxjs'

export default function App() {
  const observable = useMemo(
    () => of('World'),
    [],
  )
  const data = useObservable(observable)

  return <h1>Hello, {data}!</h1>
}

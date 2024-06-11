import {useObservable} from 'react-rx'
import {of} from 'rxjs'

const observable = of('World')

export default function App() {
  const data = useObservable(observable)

  return <h1>Hello, {data}!</h1>
}

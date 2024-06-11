import {useObservable} from 'react-rx'
import {timer} from 'rxjs'

const observable = timer(0, 1000)

export default function App() {
  const seconds = useObservable(observable)
  return <>Seconds: {seconds}</>
}

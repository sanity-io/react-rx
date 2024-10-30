import {useObservable} from 'react-rx'
import {from} from 'rxjs'

const observable = from([
  'This',
  'will',
  'only',
  'render',
  'once!',
])

function Sync() {
  const message = useObservable(observable)

  return <>{message}</>
}

export default Sync

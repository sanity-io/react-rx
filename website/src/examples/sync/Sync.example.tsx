import {useObservable} from 'react-rx'
import {from} from 'rxjs'

const observable = from([
  'Sync',
  'emissions',
  'render',
  'right',
  'after',
  'mount!',
])

function Sync() {
  // The initialValue paints first; every synchronous
  // emission arrives right after mount, so only the
  // last one is ever visible.
  const message = useObservable(observable, '…')

  return <>{message}</>
}

export default Sync

import {rxComponent} from 'react-rx-old'
import {from} from 'rxjs'

const Sync = rxComponent(
  from([
    'This',
    'will',
    'only',
    'render',
    'once!',
  ]),
)

export default Sync

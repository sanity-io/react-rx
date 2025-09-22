import {useObservable} from 'react-rx'
import {timer} from 'rxjs'

import {Ticker} from './Ticker'
import {TickerWithSubTick} from './TickerWithSubTick'

const observable = timer(0, 1000)

export default function App() {
  const tick = useObservable(observable, 0)

  return (
    <>
      <div>Tick: {tick}</div>
      <Ticker observable={observable} />
      <TickerWithSubTick
        observable={observable}
      />
    </>
  )
}

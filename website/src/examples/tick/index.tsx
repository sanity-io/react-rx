import Sandpack from '@/components/Sandpack'

import Ticker from './Ticker.tsx?raw'
import TickerWithSubTick from './TickerWithSubTick.tsx?raw'
import App from './TickExample.tsx?raw'

export default function Example() {
  return (
    <Sandpack
      files={{
        '/App.tsx': App,
        './Ticker.tsx': Ticker,
        './TickerWithSubTick.tsx':
          TickerWithSubTick,
      }}
    />
  )
}

import ExampleSandpack from '@/components/ExampleSandpack'
import {readExample} from '@/utils/readExample'

export default function Example() {
  return (
    <ExampleSandpack
      files={{
        '/App.tsx': readExample(
          'tick',
          'TickExample.tsx',
        ),
        './Ticker.tsx': readExample(
          'tick',
          'Ticker.tsx',
        ),
        './TickerWithSubTick.tsx': readExample(
          'tick',
          'TickerWithSubTick.tsx',
        ),
      }}
    />
  )
}

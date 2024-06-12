import Sandpack from '@/components/Sandpack'

import App from './App.tsx?raw'
import Counter from './Counter.tsx?raw'
import ErrorsExample from './Example.tsx?raw'

export default function Example() {
  return (
    <Sandpack
      files={{
        '/App.tsx': App,
        '/Example.tsx': ErrorsExample,
        '/Counter.tsx': Counter,
      }}
      dependencies={{
        'use-error-boundary': 'latest',
      }}
    />
  )
}

import Sandpack from '@/components/Sandpack'

import App from './FizzBuzzExample.tsx?raw'

export default function Example() {
  return (
    <Sandpack
      files={{
        '/App.tsx': App,
      }}
      useOldReactRx
    />
  )
}

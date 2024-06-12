import Sandpack from '@/components/Sandpack'

import App from './FormDataExample.tsx?raw'
import Storage from './storage.ts?raw'

export default function Example() {
  return (
    <Sandpack
      files={{
        '/App.tsx': App,
        '/storage.ts': Storage,
      }}
      useOldReactRx
      dependencies={{
        'styled-components': 'latest',
      }}
    />
  )
}

import Sandpack from '@/components/Sandpack'

import App from './EventHandlersExample.tsx?raw'

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

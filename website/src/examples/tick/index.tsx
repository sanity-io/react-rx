import Sandpack from '@/components/Sandpack'

import App from './TickExample.jsx?raw'

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

import Sandpack from '@/components/Sandpack'

import App from './Context.example.tsx?raw'

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

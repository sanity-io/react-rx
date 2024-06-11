import Sandpack from '@/components/Sandpack'

import App from './Counter.example.tsx?raw'

export default function Example() {
  return (
    <Sandpack
      files={{
        '/App.tsx': App,
      }}
    />
  )
}

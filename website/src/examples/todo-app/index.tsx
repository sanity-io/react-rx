import Sandpack from '@/components/Sandpack'

import App from './TodoApp.example.tsx?raw'

export default function Example() {
  return (
    <Sandpack
      files={{
        '/App.tsx': App,
      }}
      useOldReactRx
      dependencies={{
        'styled-components': 'latest',
      }}
    />
  )
}

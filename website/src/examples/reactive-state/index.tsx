import Sandpack from '@/components/Sandpack'

import App from './ReactiveState.example.jsx?raw'

export default function Example() {
  return (
    <Sandpack
      files={{
        '/App.tsx': App,
      }}
    />
  )
}

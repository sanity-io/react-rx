import Sandpack from '@/components/Sandpack'

import App from './TodoApp.example.tsx?raw'

export default function Example() {
  return (
    <Sandpack
      files={{
        '/App.tsx': App,
      }}
      dependencies={{
        'styled-components': 'latest',
        /**
          * Temporary, needed for legacy `rxComponent` APIs
         */
        'react-rx-old': 'npm:react-rx@2.1.3',
      }}
    />
  )
}

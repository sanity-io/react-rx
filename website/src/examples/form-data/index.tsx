import Sandpack from '@/components/Sandpack'

import App from './FormDataExample.jsx?raw'

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

import Sandpack from '@/components/Sandpack'

import App from './AnimationExample.tsx?raw'

export default function Example() {
  return (
    <Sandpack
      files={{
        '/App.tsx': App,
      }}
      useOldReactRx
      dependencies={{
        'bezier-easing': 'latest',
        'styled-components': 'latest',
      }}
    />
  )
}

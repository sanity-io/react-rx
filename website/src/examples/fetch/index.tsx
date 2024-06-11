import Sandpack from '@/components/Sandpack'

import App from './FetchExample.tsx?raw'

export default function Example() {
  return (
    <Sandpack
      files={{
        '/App.tsx': App.replace(
          'process.env.NEXT_PUBLIC_VERCEL_URL',
          JSON.stringify(
            process.env.NEXT_PUBLIC_VERCEL_URL ||
              '',
          ),
        ),
      }}
      useOldReactRx
    />
  )
}

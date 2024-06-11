import Sandpack from '@/components/Sandpack'

import App from './FetchExample.tsx?raw'

export default function Example() {
  return (
    <Sandpack
      files={{
        '/App.tsx': App.replace(
          '__VERCEL__URL__',
          process.env.NEXT_PUBLIC_VERCEL_URL ||
            '__VERCEL__URL__',
        ),
      }}
      useOldReactRx
    />
  )
}

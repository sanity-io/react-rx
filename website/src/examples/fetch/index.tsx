import Sandpack from '@/components/Sandpack'

import App from './FetchExample.tsx?raw'

export default function Example() {
  return (
    <Sandpack
      files={{
        '/App.tsx': App.replace(
          'https://react-rx-git-move-to-next.sanity.build',
          process.env
            .NEXT_PUBLIC_VERCEL_BRANCH_URL
            ? `https://${process.env.NEXT_PUBLIC_VERCEL_BRANCH_URL}`
            : 'http://localhost:3000',
        ),
      }}
      useOldReactRx
    />
  )
}

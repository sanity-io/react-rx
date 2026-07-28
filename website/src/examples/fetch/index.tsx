'use client'

import Sandpack from '@/components/Sandpack'

import App from './FetchExample.tsx?raw'

export default function Example() {
  return (
    <Sandpack
      files={{
        '/App.tsx': App.replace(
          'http://localhost:3000',
          process.env
            .NEXT_PUBLIC_VERCEL_BRANCH_URL
            ? `https://${process.env.NEXT_PUBLIC_VERCEL_BRANCH_URL}`
            : 'https://react-rx.sanity.dev',
        ),
      }}
    />
  )
}
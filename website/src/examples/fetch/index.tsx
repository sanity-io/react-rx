import ExampleSandpack from '@/components/ExampleSandpack'
import {readExample} from '@/utils/readExample'

export default function Example() {
  const app = readExample(
    'fetch',
    'FetchExample.tsx',
  ).replace(
    'http://localhost:3000',
    process.env.NEXT_PUBLIC_VERCEL_BRANCH_URL
      ? `https://${process.env.NEXT_PUBLIC_VERCEL_BRANCH_URL}`
      : 'https://react-rx.sanity.dev',
  )

  return (
    <ExampleSandpack
      files={{
        '/App.tsx': app,
      }}
    />
  )
}

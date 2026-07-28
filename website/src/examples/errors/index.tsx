import ExampleSandpack from '@/components/ExampleSandpack'
import {readExample} from '@/utils/readExample'

export default function Example() {
  return (
    <ExampleSandpack
      files={{
        '/App.tsx': readExample(
          'errors',
          'App.tsx',
        ),
        '/Example.tsx': readExample(
          'errors',
          'Example.tsx',
        ),
        '/Counter.tsx': readExample(
          'errors',
          'Counter.tsx',
        ),
      }}
      dependencies={{
        'use-error-boundary': 'latest',
      }}
    />
  )
}

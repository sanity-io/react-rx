import ExampleSandpack from '@/components/ExampleSandpack'
import {readExample} from '@/utils/readExample'

export default function Example() {
  return (
    <ExampleSandpack
      files={{
        '/App.tsx': readExample(
          'sync',
          'Sync.example.tsx',
        ),
      }}
    />
  )
}

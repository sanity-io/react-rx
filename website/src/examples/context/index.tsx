import ExampleSandpack from '@/components/ExampleSandpack'
import {readExample} from '@/utils/readExample'

export default function Example() {
  return (
    <ExampleSandpack
      files={{
        '/App.tsx': readExample('context', 'App.tsx'),
        '/ModeSwitcher.tsx': readExample('context', 'ModeSwitcher.tsx'),
        '/context.tsx': readExample('context', 'context.tsx'),
      }}
    />
  )
}

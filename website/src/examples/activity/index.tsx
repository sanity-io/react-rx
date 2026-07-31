import ExampleSandpack from '@/components/ExampleSandpack'
import {readExample} from '@/utils/readExample'

export default function Example() {
  return (
    <ExampleSandpack
      files={{
        '/App.tsx': readExample(
          'activity',
          'App.tsx',
        ),
        '/TabPanel.tsx': readExample(
          'activity',
          'TabPanel.tsx',
        ),
        '/api.ts': readExample(
          'activity',
          'api.ts',
        ),
      }}
    />
  )
}

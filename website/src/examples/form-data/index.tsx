import ExampleSandpack from '@/components/ExampleSandpack'
import {readExample} from '@/utils/readExample'

export default function Example() {
  return (
    <ExampleSandpack
      files={{
        '/App.tsx': readExample('form-data', 'FormDataExample.tsx'),
        '/storage.ts': readExample('form-data', 'storage.ts'),
      }}
      dependencies={{
        'styled-components': 'latest',
      }}
    />
  )
}

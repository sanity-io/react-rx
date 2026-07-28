import ExampleSandpack from '@/components/ExampleSandpack'
import {readExample} from '@/utils/readExample'

export default function Example() {
  return (
    <ExampleSandpack
      files={{
        '/App.tsx': readExample('animation', 'AnimationExample.tsx'),
      }}
      dependencies={{
        'bezier-easing': 'latest',
        'styled-components': 'latest',
      }}
    />
  )
}

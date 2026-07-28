import ExampleSandpack from '@/components/ExampleSandpack'
import {readExample} from '@/utils/readExample'

export default function Example() {
  return (
    <ExampleSandpack
      files={{
        '/App.tsx': readExample('todo-app', 'TodoApp.example.tsx'),
      }}
      dependencies={{
        'styled-components': 'latest',
      }}
    />
  )
}

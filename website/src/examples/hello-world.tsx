import Sandpack from '@/components/Sandpack'

export default function Example() {
  return (
    <Sandpack
      files={{
        '/App.tsx': `import {useMemo} from 'react'
import {useObservable} from 'react-rx'
import {of} from 'rxjs'

export default function App() {
  const observable = useMemo(() => of('World'), [])
  const data = useObservable(observable)
  console.log(data)

  return <h1>Hello, {data}!</h1>
}
    `,
      }}
    />
  )
}

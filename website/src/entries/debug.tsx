import './main.css'

import * as React from 'react'
import {Fragment, useState} from 'react'
import {createRoot} from 'react-dom/client'
import {useAsObservable, useObservable} from 'react-rx'

function Test(props: {count: number}) {
  const value = useObservable(useAsObservable(props.count))
  console.log(value)
  return <div>OK {value}</div>
}

function App() {
  const [count, setCount] = useState(0)

  return (
    <Fragment>
      <button onClick={() => setCount((c) => c + 1)}>Click</button>
      {count % 2 === 0 && <Test count={count} />}
      <div>Count: {count}</div>
    </Fragment>
  )
}
const root = createRoot(document.getElementById('app')!)
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

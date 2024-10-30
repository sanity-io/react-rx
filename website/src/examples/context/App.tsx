import {useMemo} from 'react'
import {Subject} from 'rxjs'

import {
  ContextProvider,
  MODE,
  type Scheme,
  useModeValue,
} from './context'
import ModeSwitcher from './ModeSwitcher'

function App() {
  const mode = useModeValue()

  return (
    <div
      style={{
        ...MODE[mode],
        padding: '1em',
      }}
    >
      <h2>Using {mode} mode</h2>
      <ModeSwitcher />
    </div>
  )
}

function Layout() {
  const mode = useMemo(
    () => new Subject<Scheme>(),
    [],
  )

  return (
    <>
      <h1>Wrapped in ContextProvider</h1>
      <ContextProvider value={mode}>
        <App />
        <App />
      </ContextProvider>
      <hr />
      <h1>Not wrapped in a Context.Provider</h1>
      <App />
    </>
  )
}

export default Layout

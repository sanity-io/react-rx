import * as React from 'react'
import {map} from 'rxjs/operators'
import {reactiveComponent, useContext, useState} from '../../../src/reactiveComponent'

type Mode = 'light' | 'dark'

interface ModeContext {
  current: Mode
  set: (nextMode: Mode) => void
}

const ModeContext = React.createContext<ModeContext>({
  current: 'light',
  set: (nextMode: Mode) => {},
})

interface Props {
  children?: React.ReactNode
}

const LIGHT = {backgroundColor: '#eee', color: '#333'}
const DARK = {backgroundColor: '#222', color: '#eee'}

const MODE = {light: LIGHT, dark: DARK}

const useMode = () => useContext(ModeContext).pipe(map(({current}) => current))

const ModeSwitch = reactiveComponent<Props>(() => {
  const modeCtx$ = useContext(ModeContext)

  return modeCtx$.pipe(
    map(({current, set}) => {
      const next = current === 'light' ? 'dark' : 'light'
      return (
        <button onClick={() => set(next)} style={MODE[current]}>
          Change to {next}
        </button>
      )
    }),
  )
})

const App = reactiveComponent(() => {
  const mode$ = useMode()

  return mode$.pipe(
    map(mode => (
      <div style={{...MODE[mode], padding: '1em'}}>
        <h2>Using {mode} mode</h2>
        <ModeSwitch />
      </div>
    )),
  )
})

export const ContextExample = reactiveComponent<{}>(() => {
  const [mode$, setMode] = useState<Mode>('light')

  return mode$.pipe(
    map(mode => (
      <>
        <ModeContext.Provider value={{current: mode, set: setMode}}>
          <App />
        </ModeContext.Provider>
      </>
    )),
  )
})

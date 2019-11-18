import {
  React,
  ReactDOM,
  component,
  useContext,
  map,
  useState
} from '../_utils/globalScope'
//@endimport

const ModeContext = React.createContext({
  current: 'light',
  set: nextMode => {}
})

const LIGHT = {backgroundColor: '#eee', color: '#333'}
const DARK = {backgroundColor: '#222', color: '#eee'}

const MODE = {light: LIGHT, dark: DARK}

const useMode = () => useContext(ModeContext).pipe(map(({current}) => current))

const ModeSwitch = component(() => {
  const modeCtx$ = useContext(ModeContext)

  return modeCtx$.pipe(
    map(({current, set}) => {
      const next = current === 'light' ? 'dark' : 'light'
      return (
        <button onClick={() => set(next)} style={MODE[current]}>
          Change to {next}
        </button>
      )
    })
  )
})

const App = component(() => {
  const mode$ = useMode()

  return mode$.pipe(
    map(mode => (
      <div style={{...MODE[mode], padding: '1em'}}>
        <h2>Using {mode} mode</h2>
        <ModeSwitch />
      </div>
    ))
  )
})

const ContextExample = component(() => {
  const [mode$, setMode] = useState('light')

  return mode$.pipe(
    map(mode => (
      <>
        <ModeContext.Provider value={{current: mode, set: setMode}}>
          <App />
        </ModeContext.Provider>
      </>
    ))
  )
})

ReactDOM.render(<ContextExample />, document.getElementById('context-example'))

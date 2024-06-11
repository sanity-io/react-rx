import {createContext} from 'react'
import {
  context,
  rxComponent,
  state,
} from 'react-rx-old'
import {map, tap} from 'rxjs/operators'

const ModeContext = createContext({
  current: 'light',
  set: (nextMode) => {},
})

const observeMode = () =>
  context(ModeContext).pipe(
    map(({current}) => current),
  )

const LIGHT = {
  backgroundColor: '#eee',
  color: '#333',
}
const DARK = {
  backgroundColor: '#222',
  color: '#eee',
}

const MODE = {
  light: LIGHT,
  dark: DARK,
}

const ModeSwitch = rxComponent(() => {
  const modeCtx$ = context(ModeContext)

  return modeCtx$.pipe(
    map(({current, set}) => {
      const next =
        current === 'light'
          ? 'dark'
          : 'light'
      return (
        <button
          onClick={() => set(next)}
          style={MODE[current]}
        >
          Change to {next}
        </button>
      )
    }),
  )
})

const App = rxComponent(() => {
  const mode$ = observeMode()

  return mode$.pipe(
    tap(console.log),
    map((mode) => (
      <div
        style={{
          ...MODE[mode],
          padding: '1em',
        }}
      >
        <h2>Using {mode} mode</h2>
        <ModeSwitch />
      </div>
    )),
  )
})

const ContextExample = rxComponent(
  () => {
    const [mode$, setMode] =
      state('light')

    return mode$.pipe(
      map((mode) => (
        <>
          <ModeContext.Provider
            value={{
              current: mode,
              set: setMode,
            }}
          >
            <App />
          </ModeContext.Provider>
        </>
      )),
    )
  },
)

export default ContextExample

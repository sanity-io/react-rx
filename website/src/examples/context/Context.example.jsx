import * as React from 'react'
import * as ReactDOM from 'react-dom'
import * as RxJS from 'rxjs'
import {tap} from 'rxjs/operators'
import * as operators from 'rxjs/operators'

const {of, from, concat, merge} = RxJS
const {
  timer,
  interval,
  throwError,
  combineLatest,
  Observable,
} = RxJS

const {map, filter, reduce, scan, tap} = operators
const {concatMap, mergeMap, switchMap, mapTo} =
  operators
const {startWith, catchError, take} = operators
//@endimport

import {observableCallback} from 'observable-callback'
import {
  context,
  elementRef,
  forwardRef,
  handler,
  rxComponent,
  state,
  useAsObservable,
  useMemoObservable,
  useObservable,
} from 'react-rx-old'

const ModeContext = React.createContext({
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
        current === 'light' ? 'dark' : 'light'
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

const ContextExample = rxComponent(() => {
  const [mode$, setMode] = state('light')

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
})

ReactDOM.render(
  <ContextExample />,
  document.getElementById('context-example'),
)

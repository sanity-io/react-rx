import * as React from 'react'
import {combineLatest} from 'rxjs'
import {map, tap} from 'rxjs/operators'
import {createState, reactiveComponent, useObservableContext} from '../../index'

const ThemeContext = React.createContext('light')

interface Props {
  onClick: (event: any) => void
  children: React.ReactNode
}
const LIGHT = {backgroundColor: '#eee', color: '#333'}
const DARK = {backgroundColor: '#333', color: '#eee'}
const ThemedButton = reactiveComponent<Props>(props$ => {
  const theme$ = useObservableContext(ThemeContext)
  return combineLatest<[Props, string]>([props$, theme$]).pipe(
    map(([props, theme]) => (
      <button onClick={props.onClick} style={theme === 'light' ? LIGHT : DARK}>
        {props.children}
      </button>
    ))
  )
})

export const ContextExample = reactiveComponent<{}>(() => {
  const [theme$, setTheme] = createState('light')

  return theme$.pipe(
    map(theme => (
      <>
        <ThemeContext.Provider value={theme}>
          <ThemedButton onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
            Toggle
          </ThemedButton>
        </ThemeContext.Provider>
      </>
    ))
  )
})
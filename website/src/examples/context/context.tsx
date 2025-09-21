import {
  createContext,
  memo,
  useCallback,
  useContext,
} from 'react'
import {useObservable} from 'react-rx'
import {Subject} from 'rxjs'

export type Scheme = 'dark' | 'light'

const Context = createContext(
  new Subject<Scheme>(),
)

function ContextProviderComponent({
  children,
  value,
}: {
  children: React.ReactNode
  value: Subject<Scheme>
}) {
  return (
    <Context.Provider value={value}>
      {children}
    </Context.Provider>
  )
}
export const ContextProvider = memo(
  ContextProviderComponent,
)

export function useModeValue() {
  const observable = useContext(Context)

  return useObservable(observable, {
    initialValue: 'light' satisfies Scheme,
  })
}

export function useSetMode() {
  const observable = useContext(Context)
  return useCallback(
    (value: Scheme) => {
      observable.next(value)
    },
    [observable],
  )
}

const LIGHT = {
  backgroundColor: '#eee',
  color: '#333',
}
const DARK = {
  backgroundColor: '#222',
  color: '#eee',
}

export const MODE = {
  light: LIGHT,
  dark: DARK,
}

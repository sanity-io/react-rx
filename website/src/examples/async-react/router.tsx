import {
  createContext,
  startTransition,
  type ReactNode,
  use,
  useCallback,
  useMemo,
  useState,
} from 'react'

/**
 * A miniature version of the original demo's router: every navigation and
 * search-param change is a React state update wrapped in startTransition,
 * so route changes are interruptible, can suspend without hiding visible
 * content, and compose with Actions. (The original also syncs the browser
 * URL through the Navigation/History APIs — trimmed here because the
 * sandbox runs in an iframe.)
 *
 * Note this state stays in React, not in a stream: transitions can only
 * mark React state updates as non-urgent, which is exactly what route
 * changes want. Server data, in contrast, lives in streams (see api.ts).
 */

interface RouterState {
  url: string
  search: Record<string, string>
}

interface RouterValue extends RouterState {
  navigate: (url: string) => void
  setParams: (key: string, value: string) => void
}

const RouterContext = createContext<RouterValue>({
  url: '/login',
  search: {},
  navigate: () => {},
  setParams: () => {},
})

export function Router({
  children,
}: {
  children: ReactNode
}) {
  const [route, setRoute] = useState<RouterState>(
    {url: '/login', search: {}},
  )

  const navigate = useCallback((url: string) => {
    startTransition(() => {
      setRoute({url, search: {}})
    })
  }, [])

  const setParams = useCallback(
    (key: string, value: string) => {
      startTransition(() => {
        setRoute((prev) => {
          const search = {...prev.search}
          if (value === '') {
            delete search[key]
          } else {
            search[key] = value
          }
          return {...prev, search}
        })
      })
    },
    [],
  )

  const value = useMemo(
    () => ({
      url: route.url,
      search: route.search,
      navigate,
      setParams,
    }),
    [route, navigate, setParams],
  )

  return (
    <RouterContext value={value}>
      {children}
    </RouterContext>
  )
}

export function useRouter(): RouterValue {
  return use(RouterContext)
}

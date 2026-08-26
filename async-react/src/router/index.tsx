// The router coordinates through object identity: refresh() re-renders every
// consumer by replacing the routerState object with a same-valued copy. The
// React Compiler memoizes the context value on its primitive fields, which
// turns refresh() into a no-op, so this file opts out of compilation.
'use no memo'

import {
  useState,
  createContext,
  use,
  useLayoutEffect,
  useEffect,
  startTransition,
  addTransitionType,
  type ReactNode,
} from 'react'

import {revalidate} from '../data/index'

type SearchParams = Record<string, string>

interface RouterContextValue {
  url: string
  search: SearchParams
  navigate: (url: string) => void
  setParams: (key: string, value: string) => void
  refresh: () => void
}

interface RouterState {
  pendingNav: () => void
  url: string
  search: SearchParams
}

// There are two example routers here.
// One uses the Navigation API and the other uses window.history,
// because not all browsers support the Navigation API yet.

// In both cases the router works by updating state in a transition,
// then calling the pendingNav callback in a useLayoutEffect after the DOM has updated.
// This lets React update the DOM in a transition before committing the navigation.

// For the Navigation API router we intercept navigations and
// call event.intercept to tell the browser we will handle it.
// We call the pendingNav callback in the intercept handler
// to tell the browser to commit the navigation after React has updated the DOM.
// This allows the browser to wait to reset focus/scroll until after the transition is done.
function NavigationRouter({children}: {children: ReactNode}) {
  const [routerState, setRouterState] = useState<RouterState>(() => ({
    pendingNav: () => {},
    url: document.location.pathname,
    search: parseSearchParams(document.location.search),
  }))

  // Kept inline so both routers expose navigate/setParams/refresh the same way.
  // oxlint-disable-next-line unicorn/consistent-function-scoping
  function navigate(url: string) {
    window.navigation.navigate(url)
  }

  function setParams(key: string, value: string) {
    const newParams = parseSearchParams(document.location.search)
    if (value !== '') {
      newParams[key] = value
    } else {
      delete newParams[key]
    }
    const newUrlParams = new URLSearchParams(newParams).toString()

    window.navigation.navigate(
      document.location.pathname + (newUrlParams ? `?${newUrlParams}` : ''),
    )
  }

  function refresh() {
    revalidate()
    startTransition(() => {
      setRouterState((prev) => {
        return {
          ...prev,
        }
      })
    })
  }

  useEffect(() => {
    function handleNavigate(event: NavigateEvent) {
      const currentEntry = window.navigation.currentEntry
      if (!event.canIntercept || !currentEntry) {
        return
      }
      const navigationType = event.navigationType
      const previousIndex = currentEntry.index
      const currURL = new URL(location.href)
      const newURL = new URL(event.destination.url)

      // If only the search params or hash are changing we want to
      // avoid the default focus reset that would happen.
      // The app can always reset focus manually if needed.
      const onlyParamsOrHash =
        newURL.pathname === currURL.pathname &&
        (newURL.search !== currURL.search || newURL.hash !== currURL.hash)

      event.intercept({
        handler() {
          // startTransition runs its scope synchronously, so the promise is
          // always assigned before it is returned.
          let promise!: Promise<void>
          startTransition(() => {
            addTransitionType('navigation-' + navigationType)
            if (navigationType === 'traverse') {
              // For traverse types it's useful to distinguish going back or forward.
              const nextIndex = event.destination.index
              if (nextIndex > previousIndex) {
                addTransitionType('navigation-forward')
              } else if (nextIndex < previousIndex) {
                addTransitionType('navigation-back')
              }
            }
            promise = new Promise((resolve) => {
              setRouterState({
                url: newURL.pathname,
                search: parseSearchParams(newURL.search),
                pendingNav: () => resolve(),
              })
            })
          })
          return promise
        },
        focusReset: onlyParamsOrHash ? 'manual' : 'after-transition',
      })
    }

    window.navigation.addEventListener('navigate', handleNavigate)
    return () => {
      window.navigation.removeEventListener('navigate', handleNavigate)
    }
  }, [])

  const pendingNav = routerState.pendingNav

  useLayoutEffect(() => {
    pendingNav()
  }, [pendingNav])

  return (
    <RouterContext
      // Deliberately not memoized: refresh() replaces routerState with an
      // equal-valued copy, so a fresh value identity is the only thing that
      // re-renders consumers after the data cache is cleared.
      // oxlint-disable-next-line react/jsx-no-constructed-context-values
      value={{
        url: routerState.url,
        search: routerState.search,
        navigate,
        setParams,
        refresh,
      }}
    >
      {children}
    </RouterContext>
  )
}

// For the History API, we just call history.pushState in the pendingNav callback.
// This means the URL in the address bar only updates after React has updated the DOM.
// This isn't ideal, but it's the best we can do without the Navigation API.
// We also listen to 'popstate' events to handle back/forward navigations.
function HistoryRouter({children}: {children: ReactNode}) {
  const [routerState, setRouterState] = useState<RouterState>({
    pendingNav: () => {},
    url: document.location.pathname,
    search: parseSearchParams(document.location.search),
  })

  function navigate(url: string) {
    startTransition(() => {
      setRouterState(() => {
        return {
          url,
          search: {},
          pendingNav() {
            window.history.pushState({}, '', url)
          },
        }
      })
    })
  }

  function setParams(key: string, value: string) {
    startTransition(() => {
      setRouterState((prev) => {
        const newParams = {...prev.search}
        if (value !== '') {
          newParams[key] = value
        } else {
          delete newParams[key]
        }
        return {
          url: prev.url,
          search: newParams,
          pendingNav() {
            const newUrlParams = new URLSearchParams(newParams).toString()
            window.history.pushState({}, '', prev.url + (newUrlParams ? `?${newUrlParams}` : ''))
          },
        }
      })
    })
  }

  function refresh() {
    revalidate()
    startTransition(() => {
      setRouterState((prev) => {
        return {
          ...prev,
        }
      })
    })
  }

  useEffect(() => {
    function handlePopState() {
      // We still popstate in a transition, but React will flush this synchronously.
      // This ensures that browser 'back' navigations are instant, but if the data
      // layer has a cache miss, it will force fallbacks to be shown. This is a good
      // example why just clearing the cache when a component unmounts is a bad idea.
      startTransition(() => {
        setRouterState({
          url: document.location.pathname,
          search: parseSearchParams(document.location.search),
          pendingNav() {
            // Noop. URL has already updated.
          },
        })
      })
    }
    window.addEventListener('popstate', handlePopState)
    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [])

  const pendingNav = routerState.pendingNav

  useLayoutEffect(() => {
    pendingNav()
  }, [pendingNav])

  return (
    <RouterContext
      // Deliberately not memoized, for the same reason as NavigationRouter.
      // oxlint-disable-next-line react/jsx-no-constructed-context-values
      value={{
        url: routerState.url,
        search: routerState.search,
        navigate,
        setParams,
        refresh,
      }}
    >
      {children}
    </RouterContext>
  )
}

let SelectedRouter = HistoryRouter
if (typeof navigation === 'object') {
  SelectedRouter = NavigationRouter
}

export const Router = SelectedRouter

const RouterContext = createContext<RouterContextValue>({
  url: '/',
  search: {},
  navigate: () => {},
  setParams: () => {},
  refresh: () => {},
})

export function useRouter() {
  return use(RouterContext)
}

function parseSearchParams(queryString: string): SearchParams {
  const params = new URLSearchParams(queryString.startsWith('?') ? queryString : `?${queryString}`)
  const result: SearchParams = {}
  for (const [key, value] of params.entries()) {
    result[key] = value
  }
  return result
}

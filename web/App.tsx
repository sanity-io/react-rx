import * as React from 'react'
import {createGlobalStyle} from 'styled-components'
import {reactiveComponent} from '../src'
import {location$} from './utils/location'
import {map, switchMap} from 'rxjs/operators'
import {pages} from './pages/pages'
import {from, of} from 'rxjs'
import {Link} from './components/Link'
import {Header} from './components/Header'

const GlobalStyle = createGlobalStyle`
body {
  background: #f0f0f0;
  color: #444;
  font-family: Inter, -apple-system, system-ui, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell,
    'Droid Sans', 'Helvetica Neue', 'Fira Sans', system-ui, sans-serif;
  font-size: 1.125rem;
}
a:link,
a:visited {
  color: #5588ee;
}
`
export const App = reactiveComponent(
  location$.pipe(
    switchMap(location => {
      const found = pages.find(page => page.route === location.pathname)
      if (!found) {
        return of(null)
      }
      return from(found.load()).pipe(map(res => ({...found, Component: res.Page})))
    }),
    map(matchingPage => {
      return (
        <>
          <GlobalStyle />
          <Header pages={pages} current={matchingPage} />
          {matchingPage && <matchingPage.Component />}
        </>
      )
    }),
  ),
)

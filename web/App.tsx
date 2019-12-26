import * as React from 'react'
import {createGlobalStyle} from 'styled-components'
import {reactiveComponent} from '../src'
import {location$} from './datastores/location'
import {map, switchMap} from 'rxjs/operators'
import {pages} from './pages/pages'
import {from, of} from 'rxjs'
import {Link} from './components/Link'
import {Header} from './components/Header'
import {page$} from './datastores/page'
import {NotFound} from './pages/NotFound'

const GlobalStyle = createGlobalStyle`
body {
  padding:0;
  margin:0;
  background: #eff0f3;
  color: #2a2a2a;
  font-family: Inter, -apple-system, system-ui, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell,
    'Droid Sans', 'Helvetica Neue', 'Fira Sans', system-ui, sans-serif;
  font-size: 1.125rem;
  overflow-y: scroll;
}
h1::before, h2::before, h3::before, h4::before { 
  display: block; 
  content: " "; 
  visibility: hidden; 
  pointer-events: none;
}
h2::before, h3::before, h4::before { 
  margin-top: -100px; 
  height: 100px; 
}
h1::before { 
  margin-top: -100px; 
  height: 100px; 
}
a:link,
a:visited {
  color: #d9376e;
  text-decoration: none;
}
`
export const App = reactiveComponent(
  page$.pipe(
    switchMap(page => {
      return page ? from(page.load()).pipe(map(res => ({...page, Component: res.Page}))) : of(page)
    }),
    map(matchingPage => {
      return (
        <>
          <GlobalStyle />
          {matchingPage ? <matchingPage.Component /> : <NotFound />}
        </>
      )
    }),
  ),
)

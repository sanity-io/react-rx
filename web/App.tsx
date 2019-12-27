import * as React from 'react'
import {createGlobalStyle} from 'styled-components'
import {reactiveComponent} from '../src'
import {map, switchMap} from 'rxjs/operators'
import {from, of} from 'rxjs'
import {page$} from './datastores/page'
import {NotFound} from './pages/NotFound'
import {COLORS, media} from './theme'

const GlobalStyle = createGlobalStyle`
body {
  ${media.between('xsmall', 'small')} {
    font-size: 12px;
  }
  ${media.between('small', 'medium')} {
    font-size: 14px;
  }
  ${media.greaterThan('medium')} {
    font-size: 16px;
  }
  ${media.greaterThan('large')} {
    font-size: 18px;
  }
  padding: 0;
  margin: 0;
  background: ${COLORS.background};
  color: ${COLORS.text};
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
  margin-top:  -6em; 
  height: 6em; 
}
h1::before { 
  margin-top:  -6em; 
  height: 6em; 
}
a:link,
a:visited {
  color: ${COLORS.link};
  text-decoration: none;
}
`
export const App = reactiveComponent(
  page$.pipe(
    switchMap(page => {
      return page
        ? from(page.load()).pipe(map(res => ({...page, Component: res.Page})))
        : of(page)
    }),
    map(matchingPage => {
      return (
        <>
          <GlobalStyle />
          {matchingPage ? <matchingPage.Component /> : <NotFound />}
        </>
      )
    })
  )
)

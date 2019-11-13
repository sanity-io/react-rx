import React from 'react'
import {createGlobalStyle} from 'styled-components'
import {Examples} from './Examples'

const GlobalStyle = createGlobalStyle`
body {
  background: #2b2b2b;
  color: aliceblue;
  font-family: Inter, -apple-system, system-ui, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell,
    'Droid Sans', 'Helvetica Neue', 'Fira Sans', system-ui, sans-serif;
  font-size: 1.125rem;
}

a:link,
a:visited {
  color: #287bde;
}
`

export const App = (props: {selectedExampleName: string}) => (
  <>
    <GlobalStyle />
    <Examples selectedExampleName={props.selectedExampleName} />
  </>
)

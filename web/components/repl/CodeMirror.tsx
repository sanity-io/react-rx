import styled from 'styled-components'
import {Controlled} from 'react-codemirror2'

export const CodeMirror = styled(Controlled)`
  background-color: rgb(40, 44, 52);
  .CodeMirror {
    padding: 0.6rem;
    height: auto;
    font-family: source-code-pro,Menlo,Monaco,Consolas,Courier New,monospace;
    font-size: 14px;
    -webkit-font-smoothing: antialiased;
    line-height: 1.4em;
  }
}`

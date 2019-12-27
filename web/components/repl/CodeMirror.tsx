import styled from 'styled-components'
import {Controlled} from 'react-codemirror2'
const SCROLLBAR_BG_COLOR = '#1f222a'
const SCROLLBAR_THUMB_COLOR = '#575757'

export const CodeMirror = styled(Controlled)`
  background-color: #282c34;

  & ::-webkit-scrollbar {
    width: 11px;
  }
  & {
    scrollbar-width: thin;
    scrollbar-color: ${SCROLLBAR_THUMB_COLOR} ${SCROLLBAR_BG_COLOR};
  }
  
  & ::-webkit-scrollbar-track {
    background: ${SCROLLBAR_BG_COLOR};
  }
  & ::-webkit-scrollbar-thumb {
    background-color: ${SCROLLBAR_THUMB_COLOR} ;
    border-radius: 6px;
    border: 3px solid ${SCROLLBAR_BG_COLOR};
  }
  .CodeMirror {
    height: 600px;
    padding: 0.6rem;
    font-family: source-code-pro,Menlo,Monaco,Consolas,Courier New,monospace;
    font-size: 14px;
    -webkit-font-smoothing: antialiased;
    line-height: 1.4em;
  }
}`

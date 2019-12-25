import {CodeMirrorMode} from './components/repl/CodeMirrorMode'
import * as React from 'react'
import styled from 'styled-components'

const ModeWrapper = styled.div`
  color: #fff;
`

const Pre = styled.code`
  background-color: #e4e4e4;
  padding: 1px 4px;
  border-radius: 2px;
  font-family: source-code-pro, Menlo, Monaco, Consolas, Courier New, monospace;
  font-size: 14px;
`

const CODEMIRROR_TSX_MODE = {name: 'jsx', base: {name: 'javascript', typescript: true}}

const CODEMIRROR_MODE_MAP = {
  'language-js': CODEMIRROR_TSX_MODE,
  'language-jsx': CODEMIRROR_TSX_MODE,
  'language-tsx': CODEMIRROR_TSX_MODE,
}

interface InlineCodeProps {
  children: string
}
interface CodeProps {
  children: string
  className: 'language-js' | 'language-jsx' | 'language-tsx'
}
export const components = {
  inlineCode: (props: InlineCodeProps) => {
    return <Pre>{props.children}</Pre>
  },
  code: (props: CodeProps) => {
    return (
      <ModeWrapper>
        <CodeMirrorMode mode={CODEMIRROR_MODE_MAP[props.className]}>
          {props.children}
        </CodeMirrorMode>
      </ModeWrapper>
    )
  },
}

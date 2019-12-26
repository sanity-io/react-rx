import * as React from 'react'
import styled from 'styled-components'
import {CodeMirrorMode} from './CodeMirrorMode'

const Details = styled.details`
  white-space: pre;
  background-color: #1f222a;
  line-height: 1.4em;
  border: 0;
  box-sizing: border-box;
  background-color: #282c34;
`

const Summary = styled.summary`
  display: inline-block;
  color: #65737e;
  font-size: 0.8em;
  margin: 0.4em 0.4em;
  font-family: source-code-pro, Menlo, Monaco, Consolas, Courier New, monospace;
  -webkit-font-smoothing: antialiased;
  padding: 0em 0.3em;
`

const StyledCodeMirrorMode = styled(CodeMirrorMode)`
  opacity: 0.7;
`

interface Props {
  mode: {}
  value: string
}

export const Prelude = (props: Props) => {
  const [isOpen, setOpen] = React.useState(false)
  return (
    <Details>
      <Summary onClick={() => setOpen(current => !current)}>
        {isOpen ? '// hide prelude' : '// show prelude'}
      </Summary>
      <StyledCodeMirrorMode mode={props.mode}>
        {props.value}
      </StyledCodeMirrorMode>
    </Details>
  )
}

import {reactiveComponent} from '../../../src'
import {combineLatest} from 'rxjs'
import {map, tap} from 'rxjs/operators'
import codemirror from 'codemirror'
import * as React from 'react'
import styled from 'styled-components'
import {useElement} from '../../../src'

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

const Code = styled.div`
  margin: 0;
  padding: 0.8rem;
  white-space: pre;
  overflow: auto;
  opacity: 0.7;
  padding: 0.9rem;
  font-family: source-code-pro, Menlo, Monaco, Consolas, Courier New, monospace;
  font-size: 14px;
  -webkit-font-smoothing: antialiased;
  line-height: 1.4em;
`

interface CodeMirrorModeProps {
  mode: {}
  children: string
}

const CodeMirrorMode = reactiveComponent<CodeMirrorModeProps>(props$ => {
  const [ref$, setRef] = useElement<HTMLDivElement>()
  return combineLatest([props$, ref$]).pipe(
    tap(([props, ref]) => {
      if (ref) {
        ;(codemirror as any).runMode(props.children, props.mode, ref)
      }
    }),
    map(() => <Code className="cm-s-custom" ref={setRef} />),
  )
})

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
      <CodeMirrorMode mode={props.mode}>{props.value}</CodeMirrorMode>
    </Details>
  )
}

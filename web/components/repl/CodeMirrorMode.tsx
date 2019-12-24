import {reactiveComponent, useElement} from '../../../src'
import {combineLatest} from 'rxjs'
import {map, tap} from 'rxjs/operators'
import codemirror from './codemirror-lib'
import * as React from 'react'
import styled from 'styled-components'

interface CodeMirrorModeProps {
  mode: {}
  children: string
}

export const CodeMirrorMode = reactiveComponent<CodeMirrorModeProps>(props$ => {
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

const Code = styled.div`
  background-color: rgb(40, 44, 52);
  margin: 0;
  padding: 0.8rem;
  white-space: pre;
  overflow: auto;
  padding: 0.9rem;
  font-family: source-code-pro, Menlo, Monaco, Consolas, Courier New, monospace;
  font-size: 14px;
  -webkit-font-smoothing: antialiased;
  line-height: 1.4em;
`

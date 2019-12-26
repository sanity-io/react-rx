import {reactiveComponent} from '../../../src'
import {map, mergeMap, switchMap, toArray} from 'rxjs/operators'
import * as React from 'react'
import styled from 'styled-components'
import {runMode} from './runMode'

interface CodeMirrorModeProps {
  mode: {}
  highlighted: number[]
  children: string
  className?: string
}

export const CodeMirrorMode = reactiveComponent<CodeMirrorModeProps>(props$ => {
  return props$.pipe(
    switchMap(props =>
      runMode(props.children, props.mode).pipe(
        toArray(),
        map(lines => (
          <Code
            className={`cm-s-custom${
              props.className ? ` ${props.className}` : ''
            }`}
          >
            {lines.map((line, lineNo) => (
              <div
                className={`cm-line${
                  (props.highlighted || []).includes(lineNo + 1)
                    ? ' CodeMirror-selected'
                    : ''
                }`}
              >
                {line.map((token, i) =>
                  token.style ? (
                    <span key={i} className={`cm-${token.style}`}>
                      {token.token}
                    </span>
                  ) : (
                    token.token
                  )
                )}
              </div>
            ))}
          </Code>
        ))
      )
    )
  )
})

const Code = styled.div`
  background-color: rgb(40, 44, 52);
  color: #fff;
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

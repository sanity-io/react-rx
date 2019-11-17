import * as React from 'react'
import * as rxjs from 'rxjs'

import * as rxjsOperators from 'rxjs/operators'
import * as repl from 'react-repl'

import {Editor, EvalCode, ShowError} from 'react-repl'
import * as rxReact from '../../../src'
import Highlight, {defaultProps} from 'prism-react-renderer'
import theme from 'prism-react-renderer/themes/oceanicNext'
// import theme from 'prism-react-renderer/themes/github'
import styled from 'styled-components'

interface Scope {
  [variableName: string]: any
}

interface Props {
  source: string
  scope?: Scope
}

const tryCompile = (code: string) => {
  try {
    return [null, repl.babel(code)?.code || '']
  } catch (error) {
    return [error]
  }
}

const evalRender = (code: string, scope: Scope = {}) => {
  return repl.evalCallback(code, 'render', {
    ...scope,
    React,
    operators: rxjsOperators,
    rxjs: rxjs,
    ...rxReact,
  })
}

const COMMON_PRELUDE = `import * as React from 'react'
import * as rxjs from 'rxjs'
import * as operators from 'rxjs/operators'
import {
  component,
  useEvent,
  useContext,
  useState,
  forwardRef,
} from '@sanity/react-observable'
`

const stripImports = (str: string) => {
  return str
    .split('\n')
    .map(l => l.trim())
    .filter(l => !l.startsWith('import '))
    .join('\n')
    .trim()
}
const Line = styled.div`
  white-space: pre;
`

const highlight = (code: string) => (
  <Highlight {...defaultProps} theme={theme} code={code} language="jsx">
    {({className, style, tokens, getLineProps, getTokenProps}) => (
      <>
        {tokens.map((line, i) => (
          <Line {...getLineProps({line, key: i})}>
            {line.map((token, key) => (
              <span {...getTokenProps({token, key})} />
            ))}
          </Line>
        ))}
      </>
    )}
  </Highlight>
)

const Prelude = styled.details`
  border: 0;
  summary {
    opacity: 0.5;
    position: relative;
    padding-right: 0.2em;
    right: 0;
    text-align: right;
  }
  box-sizing: border-box;
  font-family: 'Dank Mono', 'Fira Code', 'Fira Mono', monospace;
  font-size: 0.9em;
`
const StyledEditor = styled(Editor)`
  border: 0;
  box-sizing: border-box;
  font-family: 'Dank Mono', 'Fira Code', 'Fira Mono', monospace;
  font-size: 0.9em;
`

const commentStyle = theme.styles.find(s => s.types.includes('comment'))

const COMMON_PRELUDE_ELEMENT = highlight(COMMON_PRELUDE)
export function CodeBlock(props: Props) {
  const source = stripImports(props.source)
  const [code, setCode] = React.useState(source.trim())

  const [compileError, transformed] = tryCompile(code)

  return (
    <div style={{padding: 20}}>
      <div style={{padding: 4, ...theme.plain}}>
        <Prelude>
          <summary style={commentStyle.style}>Show imports</summary>
          <div style={{opacity: 0.5, padding: 8}}>{COMMON_PRELUDE_ELEMENT}</div>
        </Prelude>
        <StyledEditor padding={8} value={code} onChange={setCode} highlight={highlight} />
      </div>

      <div>
        {compileError ? (
          <ShowError title="Compile error">{compileError.message}</ShowError>
        ) : (
          <EvalCode
            code={transformed}
            evalWith={src => evalRender(src, props.scope)}
            renderError={error => <ShowError title="Runtime error">{error.message}</ShowError>}
          />
        )}
      </div>
    </div>
  )
}

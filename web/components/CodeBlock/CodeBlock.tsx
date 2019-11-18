import * as React from 'react'

import * as globalScope from '../../examples/_utils/globalScope'
import * as repl from 'react-repl'
import {Editor, EvalCode} from 'react-repl'
import prism, {languages} from 'prismjs'
import 'prismjs/components/prism-javascript'
import 'prismjs/components/prism-jsx'
// import 'prismjs/components/prism-tsx'
// import './prism-tsx'
import Highlight, {defaultProps} from 'prism-react-renderer'
import theme from 'prism-react-renderer/themes/oceanicNext'
// import theme from 'prism-react-renderer/themes/github'
import styled from 'styled-components'
import {Checkerboard} from './Checkerboard'
import {ShowError} from './ShowError'
import {evalReactDomRender} from './evalReactDomRender'

interface Scope {
  [variableName: string]: any
}

interface Props {
  source: string
  scope?: Scope
  filename: string
}

const tryCompile = (code: string, filename: string) => {
  try {
    return [null, repl.babel(code, {filename})?.code || '']
  } catch (error) {
    return [error]
  }
}

const evalRender = (code: string, scope: Scope = {}) => {
  return evalReactDomRender(code, {
    ...scope,
    ...globalScope,
  })
}

const fs = require('fs')
const COMMON_PRELUDE =
  fs
    .readFileSync(`${__dirname}/../../examples/_utils/globalScope.ts`, 'utf-8')
    .split('//@endimport')[0] +
  `import {
  component,
  useEvent,
  useContext,
  useState,
  forwardRef
} from 'react-rx'`

const stripImports = (str: string) => {
  return str
    .split('//@endimport')
    .slice(-1)[0]
    .trim()
}
const Line = styled.div`
  overflow-wrap: break-word;
`

const highlightReactPrismRenderer = (code: string) => (
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
const highlightNativePrism = (code: string) => prism.highlight(code, languages.jsx, 'jsx')

const Prelude = styled.details`
  border: 0;
  summary {
    opacity: 0.5;
    position: relative;
    padding-right: 0.2em;
    right: 0;
    text-align: right;
  }
  white-space: pre;
  box-sizing: border-box;
  font-family: 'Dank Mono', 'Fira Code', 'Fira Mono', monospace;
  font-size: 0.9em;
`
const StyledEditor = styled(Editor)`
  border: 0;
  textarea {
    outline: none;
  }
  box-sizing: border-box;
  font-family: 'Dank Mono', 'Fira Code', 'Fira Mono', monospace;
  font-size: 0.9em;
`

const Output = styled.div`
  label {
    display: block;
    margin-top: 10px;
  }
  input,
  textarea {
    width: 100%;
    display: block;
    border-width: 1px;
    border-style: solid;
    border-color: rgb(204, 204, 204);
    border-image: initial;
    padding: 5px;
  }
`

const commentStyle = theme.styles.find(s => s.types.includes('comment'))

const highlight = highlightNativePrism
const COMMON_PRELUDE_ELEMENT = {__html: highlight(COMMON_PRELUDE)}

const HEIGHT_EM = 30

export function CodeBlock(props: Props) {
  const source = stripImports(props.source)
  const [code, setCode] = React.useState(source.trim())

  const [compileError, transformed] = tryCompile(code, props.filename)

  return (
    <div style={{display: 'flex'}}>
      <div
        style={{
          padding: 4,
          ...theme.plain,
          overflowY: 'auto',
          width: '60%',
        }}
      >
        <Prelude>
          <summary style={commentStyle.style}>{'// Show imports'}</summary>
          <div
            style={{opacity: 0.5, padding: 8}}
            dangerouslySetInnerHTML={COMMON_PRELUDE_ELEMENT}
          />
        </Prelude>
        <StyledEditor
          style={{minHeight: '10em'}}
          padding={8}
          value={code}
          onChange={setCode}
          highlight={highlight}
        />
      </div>

      <div style={{width: '40%'}}>
        <Checkerboard style={{width: '100%', height: '100%', overflowY: 'auto'}}>
          <div style={{maxHeight: '94%', maxWidth: '95%', padding: 10}}>
            {compileError ? (
              <ShowError title="Compile error">{compileError.message}</ShowError>
            ) : (
              <Output>
                <EvalCode
                  code={transformed}
                  evalWith={src => evalRender(src, props.scope)}
                  renderError={error => (
                    <ShowError title="Runtime error">{error.message}</ShowError>
                  )}
                />
              </Output>
            )}
          </div>
        </Checkerboard>
      </div>
    </div>
  )
}

import * as React from 'react'

import * as globalScope from '../../examples/_utils/globalScope'
import * as repl from 'react-repl'
import {Editor, EvalCode} from 'react-repl'
import optionalChaining from '@babel/plugin-proposal-optional-chaining'

import {Controlled as CodeMirror} from 'react-codemirror2'
require('codemirror/mode/javascript/javascript')
require('codemirror/mode/jsx/jsx')
require('codemirror/addon/selection/active-line')
require('codemirror/addon/edit/matchbrackets')
require('codemirror/addon/edit/matchtags')

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
    return [null, repl.babel(code, {filename, plugins: [optionalChaining]})?.code || '']
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

const StyledCodeMirror = styled(CodeMirror)`
  max-height: 40rem;
  background-color: rgb(40, 44, 52);
  .CodeMirror {
    padding: 5px;
    height: auto;
    font-family: source-code-pro,Menlo,Monaco,Consolas,Courier New,monospace;
    font-size: 14px;
    -webkit-font-smoothing: antialiased;
    line-height: 1.4em;
  }
}`
export function CodeBlock(props: Props) {
  const source = stripImports(props.source)
  const [code, setCode] = React.useState(source.trim())

  const [compileError, transformed] = tryCompile(code, props.filename)

  return (
    <div style={{display: 'flex'}}>
      <div
        style={{
          padding: 4,
          overflowY: 'auto',
          width: '60%',
        }}
      >
        <StyledCodeMirror
          value={code}
          options={{
            theme: 'custom',
            styleActiveLine: true,
            smartIndent: false,
            tabSize: 2,
            matchBrackets: true,
            matchTags: true,
            mode: {name: 'jsx', base: {name: 'javascript', typescript: true}},
            // mode: 'javascript',
          }}
          onBeforeChange={(editor, data, value) => {
            setCode(value)
          }}
          onChange={(editor, data, value) => {}}
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

import * as React from 'react'

import * as globalScope from '../../examples/_utils/globalScope'
import {Checkerboard} from './Checkerboard'
import {ShowError} from './ShowError'
import {CodeMirror} from './CodeMirror'
import {compile} from './compile/babel'
import {evalReactDomRender} from './eval/evalReactDomRender'
import {Prelude} from './Prelude'
import {EvalCode} from './EvalCode'
import './codemirror-lib'

const fs = require('fs')

interface Scope {
  [variableName: string]: any
}

interface Props {
  source: string
  scope?: Scope
  filename: string
  prelude?: string
}

const tryCompile = (code: string, filename: string) => {
  try {
    return [null, compile(code, {filename})?.code || '']
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

const COMMON_PRELUDE = `import {reactiveComponent, useEvent, useContext, useState, forwardRef} from 'react-rx'\n${
  fs
    .readFileSync(`${__dirname}/../../examples/_utils/globalScope.ts`, 'utf-8')
    .split('//@endimport')[0]
}`

const stripImports = (str: string) => {
  return str
    .split('//@endimport')
    .slice(-1)[0]
    .trim()
}

const CODEMIRROR_MODE = {name: 'jsx', base: {name: 'javascript', typescript: true}}

const CODEMIRROR_OPTIONS = {
  theme: 'custom',
  smartIndent: false,
  tabSize: 2,
  mode: CODEMIRROR_MODE,
}

export function CodeBlock(props: Props) {
  const source = stripImports(props.source)
  const [code, setCode] = React.useState(source.trim())

  const [compileError, transformed] = tryCompile(code, props.filename)
  return (
    <div style={{display: 'flex'}}>
      <div
        style={{
          overflowY: 'auto',
          width: '60%',
        }}
      >
        <Prelude
          mode={CODEMIRROR_MODE}
          value={`${COMMON_PRELUDE}${props.prelude ? props.prelude : ''}`}
        />
        <CodeMirror
          value={code}
          options={CODEMIRROR_OPTIONS}
          onBeforeChange={(editor, data, value) => {
            setCode(value)
          }}
        />
      </div>

      <div style={{width: '40%'}}>
        <Checkerboard style={{width: '100%', height: '100%', overflowY: 'auto'}}>
          <div style={{padding: '2em'}}>
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
        </Checkerboard>
      </div>
    </div>
  )
}

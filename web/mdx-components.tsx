import {CodeMirrorMode} from './components/repl/CodeMirrorMode'
import * as React from 'react'
import styled from 'styled-components'
import {Link} from './components/Link'
import {reactiveComponent} from '../src/reactiveComponent'
import {map, tap} from 'rxjs/operators'
import {combineLatest} from 'rxjs'
import {location$} from './datastores/location'
import {parseCodeFenceHeader} from './utils/parseCodeFenceHeader'
const ModeWrapper = styled.div`
  color: #fff;
`

const Pre = styled.code`
  background-color: #e4e4e4;
  padding: 1px 4px;
  border-radius: 2px;
  font-family: monospace;
`

const CODEMIRROR_TSX_MODE = {name: 'jsx', base: {name: 'javascript', typescript: true}}

const CODEMIRROR_MODE_MAP = {
  js: CODEMIRROR_TSX_MODE,
  jsx: CODEMIRROR_TSX_MODE,
  tsx: CODEMIRROR_TSX_MODE,
  ts: CODEMIRROR_TSX_MODE,
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
    const [lang, range] = parseCodeFenceHeader(props.className.replace(/^language-/, ''))

    return (
      <ModeWrapper>
        <CodeMirrorMode highlighted={range} mode={CODEMIRROR_MODE_MAP[lang]}>{props.children}</CodeMirrorMode>
      </ModeWrapper>
    )
  },
}

const hash$ = location$.pipe(map(location => location.hash))

const BookmarkedLink = reactiveComponent(props$ =>
  combineLatest([props$, hash$]).pipe(
    map(([props, hash]) => (
      <a href={props.href} className={hash === props.href ? 'selected' : ''}>
        {props.children}
      </a>
    )),
  ),
)

export const tocComponents = {
  a: BookmarkedLink,
}

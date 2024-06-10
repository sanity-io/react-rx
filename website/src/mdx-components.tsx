import type {MDXComponents} from 'mdx/types'

import {InlineCode, ModeWrapper} from '@/mdx-components.styled'

import {CodeMirrorMode} from './components/repl/CodeMirrorMode'
import {ModeSpec} from './components/repl/runMode'
import {parseCodeFenceHeader} from './utils/parseCodeFenceHeader'

const CODEMIRROR_TSX_MODE: ModeSpec = {
  name: 'jsx',
  base: {name: 'javascript', typescript: true},
}

const TSX_MODE_TYPES = ['js', 'jsx', 'tsx', 'ts']

interface CodeProps {
  children: string
  className: 'language-js' | 'language-jsx' | 'language-tsx'
}

export const components = {
  inlineCode: InlineCode,
  /*
  code: (props: CodeProps) => {
    const {className = ''} = props
    const [lang, range] = className
      ? parseCodeFenceHeader(className.replace(/^language-/, ''))
      : [null, []]
    const mode = lang && TSX_MODE_TYPES.includes(lang) ? CODEMIRROR_TSX_MODE : null
    return (
      <ModeWrapper>
        <CodeMirrorMode highlighted={range} mode={mode}>
          {props.children}
        </CodeMirrorMode>
      </ModeWrapper>
    )
  },
  // */
}

export function useMDXComponents(_components: MDXComponents): MDXComponents {
  console.log('components:', _components)
  return {
    ...components,
    ..._components,
  }
}

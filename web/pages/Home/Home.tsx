import * as React from 'react'
import {Header} from '../../components/Header'
import {Container, Content, ContentInner} from './styles'
import Readme from './README.mdx'
import {MDXProvider} from '@mdx-js/react'
import {CodeMirrorMode} from '../../components/repl/CodeMirrorMode'
import styled from 'styled-components'

const ModeWrapper = styled.div`
  color: #fff;
`

const Pre = styled.code`
  background-color: #e4e4e4;
  padding: 1px 4px;
  border-radius: 2px;
  font-family: source-code-pro, Menlo, Monaco, Consolas, Courier New, monospace;
  font-size: 14px;
`

const CODEMIRROR_MODE = {name: 'jsx', base: {name: 'javascript', typescript: true}}
const components = {
  inlineCode: props => {
    return <Pre>{props.children}</Pre>
  },
  code: props => {
    return (
      <ModeWrapper>
        <CodeMirrorMode mode={CODEMIRROR_MODE}>{props.children}</CodeMirrorMode>
      </ModeWrapper>
    )
  },
}

export const Page = () => (
  <>
    <Header />
    <Container>
      <Content>
        <ContentInner>
          <MDXProvider components={components}>
            <Readme />
          </MDXProvider>
        </ContentInner>
      </Content>
    </Container>
  </>
)

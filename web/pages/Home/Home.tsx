import * as React from 'react'
import {Header} from '../../components/Header'
import {Container, ContentInner} from '../styles'
import Readme from '../../../README.md'
import {MDXProvider} from '@mdx-js/react'
import {components} from '../../mdx-components'
import {ReactRxLogo} from '../../components/logos/ReactRxLogo'
import styled from 'styled-components'
import {COLORS} from '../../theme'

const Content = styled.div`
  margin-top: 5em;
`
const ContentInner = styled.div`
  padding: 1em 1em;
`
const Cover = styled.div`
  background: ${COLORS.shadow};
  color: ${COLORS.background};
  padding-top: 2em;
  font-size: 2em;
  display: flex;
  flex-direction: row;
  justify-content: center;
  h1 {
    padding: 0 0 0 0.1em;
  }
`

const Subsection = styled.div`
  display: flex;
  flex-direction: column;
`
export const Page = () => (
  <>
    <Header />
    <Content>
      <Cover>
        <ReactRxLogo size="4em" />
        <h1>ReactRx</h1>
      </Cover>
      <ContentInner>
        <Subsection>
          <MDXProvider components={components}>
            <Readme />
          </MDXProvider>
        </Subsection>
      </ContentInner>
    </Content>
  </>
)

import {MDXProvider} from '@mdx-js/react'
import * as React from 'react'
import styled from 'styled-components'

import {Header} from '../../components/Header'
import {ReactRxLogo} from '../../components/logos/ReactRxLogo'
import {components} from '../../mdx-components'
import {COLORS} from '../../theme'
import ReactRxReadme from './ReactRxReadme.md'

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
export const IndexPage = () => (
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
            <ReactRxReadme />
          </MDXProvider>
        </Subsection>
      </ContentInner>
    </Content>
  </>
)

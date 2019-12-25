import {Header} from '../../components/Header'
import {Container, Content, ContentInner} from '../Home/styles'
import MDXContent from './Guide.mdx'
import * as React from 'react'
import {MDXProvider} from '@mdx-js/react'
import {components} from '../../mdx-components'
import styled from 'styled-components'

const StyledInner = styled(ContentInner)`
  h1:first-child {
    display: none;
  }
  > ul:nth-child(2) {
    position: fixed;
    top: 2.5em;
    left: 0;
    background-color: #fffffe;
    bottom: 0;
    padding: 4em 0 0 1em;
    width: 250px;
    margin-top: 2em;
    li {
      list-style: none;
      padding-top: 0.5em;
      a,
      a:link,
      a:visited {
        color: #d9376e;
      }
      a.selected {
        border-bottom: 5px solid #ff8e3c;
      }
      > ul {
        padding: 0 0 1em 0.7em;
      }
    }
  }
`

export const Page = () => (
  <>
    <Header />
    <Container>
      <Content>
        <StyledInner>
          <MDXProvider components={components}>
            <MDXContent />
          </MDXProvider>
        </StyledInner>
      </Content>
    </Container>
  </>
)

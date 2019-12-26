import {Header} from '../../components/Header'
import {Container, Content, ContentInner, Sidebar} from '../styles'
import MDXContent, {Toc} from './Api.mdx'
import * as React from 'react'
import {MDXProvider} from '@mdx-js/react'
import {components, tocComponents} from '../../mdx-components'

export const Page = () => (
  <>
    <Header />
    <Container>
      <Sidebar>
        <h4>API Reference</h4>
        <MDXProvider components={tocComponents}>
          <Toc />
        </MDXProvider>
      </Sidebar>
      <Content>
        <ContentInner>
          <MDXProvider components={components}>
            <MDXContent />
          </MDXProvider>
        </ContentInner>
      </Content>
    </Container>
  </>
)

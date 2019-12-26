import {Header} from '../../components/Header'
import MDXContent, {Toc} from './Guide.mdx'
import * as React from 'react'
import {MDXProvider} from '@mdx-js/react'
import {components, tocComponents} from '../../mdx-components'
import {Container, Content, ContentInner, Sidebar} from '../styles'

export const Page = () => (
  <>
    <Header />
    <Container>
      <Sidebar>
        <h4>Guide</h4>
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

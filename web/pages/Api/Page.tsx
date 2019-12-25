import {Header} from '../../components/Header'
import {Container, Content, ContentInner} from '../Home/styles'
import MDXContent from './Api.mdx'
import * as React from 'react'
import {MDXProvider} from '@mdx-js/react'
import {components} from '../../mdx-components'

export const Page = () => (
  <>
    <Header />
    <Container>
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

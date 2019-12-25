import * as React from 'react'
import {Header} from '../../components/Header'
import {Container, Content, ContentInner} from './styles'
import Readme from '../../../README.md'
import {MDXProvider} from '@mdx-js/react'
import {components} from '../../mdx-components'

export const Page = () => (
  <>
    <Header />
    <Container>
      <ContentInner>
        <MDXProvider components={components}>
          <Readme />
        </MDXProvider>
      </ContentInner>
    </Container>
  </>
)

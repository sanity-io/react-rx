import {MDXProvider} from '@mdx-js/react'
import * as React from 'react'

import {Header} from '../../components/Header'
import {Sidebar} from '../../components/Sidebar'
import {components} from '../../mdx-components'
import {Container, Content} from '../styles'
import MDXContent from './Guide.mdx'

export const GuidePage = () => (
  <>
    <Header />
    <Container>
      <Sidebar heading="Guide">
        {/* <MDXProvider components={tocComponents}> */}
        {/* <Toc /> */}
        TOC
        {/* </MDXProvider> */}
      </Sidebar>
      <Content>
        <MDXProvider components={components}>
          <MDXContent />
        </MDXProvider>
      </Content>
    </Container>
  </>
)

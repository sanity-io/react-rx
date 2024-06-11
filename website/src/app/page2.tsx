import {CustomMDX} from '@/components/CustomMDX'
import {ReactRxLogo} from '@/components/logos/ReactRxLogo'
import {readFile} from '@/utils/readFile'

import {Content, ContentInner, Cover, Subsection} from './page.styles'

export default async function IndexPage() {
  const mdxContent = await readFile('page.md')

  return (
    <Content>
      <Cover>
        <ReactRxLogo size="4em" />
        <h1>ReactRx</h1>
      </Cover>
      <ContentInner>
        <Subsection>
          <CustomMDX source={mdxContent} />
        </Subsection>
      </ContentInner>
    </Content>
  )
}

import {generateStaticParamsFor, importPage} from 'nextra/pages'

import {expandExampleSources} from '@/utils/agentMarkdown'

import {useMDXComponents as getMDXComponents} from '../../../mdx-components'

export const generateStaticParams = generateStaticParamsFor('mdxPath')

export async function generateMetadata(props: PageProps) {
  const params = await props.params
  const {metadata} = await importPage(params.mdxPath)
  // Match previous theme.config behavior: home page title is just "ReactRx"
  if (!params.mdxPath?.length) {
    return {...metadata, title: {absolute: 'ReactRx'}}
  }
  return metadata
}

type PageProps = Readonly<{
  params: Promise<{mdxPath?: string[]}>
}>

const Wrapper = getMDXComponents().wrapper

export default async function Page(props: PageProps) {
  const params = await props.params
  const {default: MDXContent, toc, metadata, sourceCode} = await importPage(params.mdxPath)
  return (
    // `sourceCode` feeds the theme's "Copy page" button; expanding the example embeds makes the
    // copied markdown include the Sandpack sources instead of opaque `<Example />` tags.
    <Wrapper toc={toc} metadata={metadata} sourceCode={expandExampleSources(sourceCode)}>
      <MDXContent {...props} params={params} />
    </Wrapper>
  )
}

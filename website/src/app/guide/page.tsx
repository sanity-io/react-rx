import type {Metadata} from 'next'

import {Sidebar} from '@/components/Sidebar'
import {compileTocMDX} from '@/utils/compileTocMDX'
import {readFile} from '@/utils/readFile'

import {Content} from '../styles'

const title = 'Guide'

export const metadata = {title} satisfies Metadata

export default async function GuidePage() {
  const MDXContent = await readFile('guide/pages.md')
  const {content, toc} = await compileTocMDX(MDXContent)

  return (
    <>
      <Sidebar heading={title}>{toc}</Sidebar>
      <Content>{content}</Content>
    </>
  )
}

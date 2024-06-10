import {Code} from 'bright'
import {compileMDX, type MDXRemoteProps} from 'next-mdx-remote/rsc'
import rehypeAutolinkHeadings from 'rehype-autolink-headings'
import remarkEmoji from 'remark-emoji'
import remarkSlug from 'remark-slug'
import remarkToc from 'remark-toc'

Code.theme = 'github-dark-dimmed'

import {inlineCode} from '@/components/mdx/inlineCode'

const components = {
  inlineCode,
  pre: Code,
}

export async function compileTocMDX(source: string) {
  const {content, frontmatter} = await compileMDX({
    source,
    components,
    options: {
      mdxOptions: {
        remarkPlugins: [remarkEmoji, remarkToc, remarkSlug],
        rehypePlugins: [rehypeAutolinkHeadings],
      },
      parseFrontmatter: true,
    },
  })
  console.log({frontmatter, source})
  return {content, toc: (frontmatter?.toc as string) || ''}
}

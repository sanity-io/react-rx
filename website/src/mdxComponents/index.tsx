import Link from 'next/link'
import {type MDXComponents} from 'next-mdx-remote-client/rsc'

import {inlineCode} from './inlineCode'
import {pre} from './pre'
import {Toc} from './Toc'

export const mdxComponents: MDXComponents = {
  Toc,
  Link,
  pre,
  inlineCode,
}

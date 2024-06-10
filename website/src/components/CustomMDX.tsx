import {MDXRemote} from 'next-mdx-remote/rsc'

import {inlineCode} from './mdx/inlineCode'

const components = {
  inlineCode,
}

export function CustomMDX(props: React.ComponentProps<typeof MDXRemote>) {
  return (
    <MDXRemote
      {...props}
      options={{
        mdxOptions: {},
      }}
      components={{...components, ...(props.components || {})}}
    />
  )
}

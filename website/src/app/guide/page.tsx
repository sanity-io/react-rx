import fs from 'node:fs/promises'
import path from 'node:path'

import {Suspense} from 'react'

import Report from './Report'

export default async function GuidePage() {
  const MDXContent = await fs.readFile(path.join(process.cwd(), 'src/app/guide/pages.mdx'), 'utf-8')

  return (
    <Suspense>
      <Report mdx={MDXContent} />
    </Suspense>
  )
}

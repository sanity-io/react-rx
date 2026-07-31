import {importPage} from 'nextra/pages'

import {collectDocPages, expandExampleSources} from '@/utils/agentMarkdown'

export const dynamic = 'force-static'

const SITE_URL = 'https://react-rx.dev'

/**
 * The entire documentation as one markdown file, with every interactive example expanded into its
 * Sandpack source files. Lets agents read the docs without scraping HTML.
 */
export async function GET(): Promise<Response> {
  const pages = await collectDocPages()
  const sections = await Promise.all(
    pages.map(async (page) => {
      const {sourceCode} = await importPage(page.mdxPath)
      const header = `---\ntitle: ${page.title}\nurl: ${SITE_URL}${page.route || '/'}\n---`
      return `${header}\n\n${expandExampleSources(sourceCode).trim()}`
    }),
  )
  return new Response(sections.join('\n\n'), {
    headers: {'Content-Type': 'text/plain; charset=utf-8'},
  })
}

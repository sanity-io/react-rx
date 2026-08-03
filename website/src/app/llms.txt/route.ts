import {collectDocPages} from '@/utils/agentMarkdown'

export const dynamic = 'force-static'

const SITE_URL = 'https://react-rx.dev'

/** llms.txt index (https://llmstxt.org): a short, linkable table of contents for LLMs. */
export async function GET(): Promise<Response> {
  const pages = await collectDocPages()
  const links = pages.map((page) => `- [${page.title}](${SITE_URL}${page.route || '/'})`).join('\n')
  const body = `# ReactRx

> Hooks for combining React with RxJS Observables. The \`react-rx\` package provides \`useObservable\`, \`useSyncObservable\` and friends for subscribing to RxJS observables from React components without the re-render-on-mount tax.

The full documentation, including the source code of every interactive example, is available as a single markdown file at ${SITE_URL}/llms-full.txt.

## Docs

${links}

## Agent skill

A best-practices skill for writing and reviewing React components that consume observables — hook selection (with per-hook "when not to use" lists), referential stability, and refactoring hand-rolled \`useEffect\` + \`.subscribe()\` bridges.

- Install: \`npx skills add sanity-io/react-rx --skill react-rx-best-practices\`
- Registry: https://skills.sh/sanity-io/react-rx
- Source (readable without installing): https://github.com/sanity-io/react-rx/tree/current/.agents/skills/react-rx-best-practices
`
  return new Response(body, {
    headers: {'Content-Type': 'text/plain; charset=utf-8'},
  })
}

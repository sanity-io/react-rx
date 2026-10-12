import {collectDocPages} from '@/utils/agentMarkdown'

export const dynamic = 'force-static'

const SITE_URL = 'https://react-rx.dev'

/** llms.txt index (https://llmstxt.org): a short, linkable table of contents for LLMs. */
export async function GET(): Promise<Response> {
  const pages = await collectDocPages()
  const links = pages.map((page) => `- [${page.title}](${SITE_URL}${page.route || '/'})`).join('\n')
  const body = `# ReactRx

> React hooks for reading RxJS observables. Use \`useObservable\` for deferred display updates, \`useSyncObservable\` for controlled inputs, and \`useObservablePromise\` for Suspense. The value hooks require an initial value and subscribe after commit, not during render.

The full documentation, including the source code of every interactive example, is available as a single markdown file at ${SITE_URL}/llms-full.txt.

## Agent skill

Install the dedicated react-rx best-practices skill with \`npx skills add sanity-io/react-rx --skill react-rx-best-practices\`.
It covers hook selection, explicit initial values, stable observables, Suspense boundaries and preloading, and when to keep a manual subscription.
A broader RxJS skill is also available: \`npx skills add sanity-io/react-rx --skill rxjs-like-a-pro\`.

- [Skill source](https://github.com/sanity-io/react-rx/tree/current/.agents/skills)

## Docs

${links}
`
  return new Response(body, {
    headers: {'Content-Type': 'text/plain; charset=utf-8'},
  })
}

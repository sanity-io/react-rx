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

Install the repository's RxJS and react-rx guidance with \`npx skills add sanity-io/react-rx --skill rxjs-like-a-pro\`.
It covers hook selection, stable observables, Suspense boundaries, and when to keep a manual subscription.

- [Skill source](https://github.com/sanity-io/react-rx/blob/current/.agents/skills/rxjs-like-a-pro/SKILL.md)

## Docs

${links}
`
  return new Response(body, {
    headers: {'Content-Type': 'text/plain; charset=utf-8'},
  })
}

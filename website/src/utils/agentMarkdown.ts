import type {PageMapItem} from 'nextra'
import {getPageMap} from 'nextra/page-map'

import {type ExampleManifest, exampleManifests, type ExampleName} from '@/examples/manifests'
import {getExampleFiles} from '@/utils/exampleFiles'

/**
 * Utilities for turning docs pages into agent/LLM-friendly markdown. Used by the theme's
 * "Copy page" button (via the `sourceCode` prop) and by the `/llms.txt` + `/llms-full.txt` routes.
 */

const EXAMPLE_IMPORT_RE = /^import\s+(\w+)\s+from\s+'@\/examples\/([\w-]+)'[ \t]*\r?\n?/gm

/**
 * Replaces `@/examples/*` component embeds in a page's raw MDX with fenced code blocks containing
 * the example's actual source files (the same files the Sandpack sandbox runs). Without this, the
 * copied markdown only contains an opaque `<Example />` tag and none of the example code.
 */
export function expandExampleSources(sourceCode: string): string {
  const aliases = new Map<string, ExampleName>()
  let result = sourceCode.replace(EXAMPLE_IMPORT_RE, (match, alias: string, example: string) => {
    if (!isExampleName(example)) return match
    aliases.set(alias, example)
    return ''
  })
  for (const [alias, example] of aliases) {
    const tagRe = new RegExp(`^[ \\t]*<${alias}\\s*/>[ \\t]*$`, 'gm')
    result = result.replace(tagRe, () => exampleToMarkdown(example))
  }
  return result.replace(/^\s*\n/, '')
}

function isExampleName(name: string): name is ExampleName {
  return name in exampleManifests
}

function exampleToMarkdown(example: ExampleName): string {
  const {dependencies}: ExampleManifest = exampleManifests[example]
  const blocks = Object.entries(getExampleFiles(example)).map(([sandpackPath, source]) => {
    const filename = sandpackPath.replace(/^\.?\//, '')
    const language = filename.split('.').at(-1) ?? ''
    const fence = fenceFor(source)
    return `${fence}${language} filename="${filename}"\n${source.trimEnd()}\n${fence}`
  })
  const dependencyNames = Object.keys(dependencies ?? {})
  if (dependencyNames.length > 0) {
    const list = dependencyNames.map((name) => `\`${name}\``).join(', ')
    blocks.push(`Extra npm dependencies used by this example: ${list}.`)
  }
  return blocks.join('\n\n')
}

/** A fence long enough that no backtick run inside the code can terminate it early. */
function fenceFor(source: string): string {
  const longestRun = source
    .match(/`{3,}/g)
    ?.reduce((longest, run) => Math.max(longest, run.length), 0)
  return '`'.repeat(Math.max(3, (longestRun ?? 0) + 1))
}

export interface DocPage {
  /** Route of the page, e.g. `/examples/simple`. */
  route: string
  title: string
  /** Path segments for `importPage()`. */
  mdxPath: string[]
}

/** Flattens the Nextra page map into an ordered list of documentation pages. */
export async function collectDocPages(): Promise<DocPage[]> {
  return flattenPageMap(await getPageMap())
}

function flattenPageMap(items: PageMapItem[]): DocPage[] {
  const pages: DocPage[] = []
  for (const item of items) {
    if ('children' in item) {
      pages.push(...flattenPageMap(item.children))
    } else if ('route' in item && 'name' in item) {
      pages.push({
        route: item.route,
        title: 'title' in item && typeof item.title === 'string' ? item.title : item.name,
        mdxPath: item.route.split('/').filter(Boolean),
      })
    }
  }
  return pages
}

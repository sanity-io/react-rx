import {existsSync, readdirSync} from 'node:fs'
import path from 'node:path'

import {close, createIndex} from 'pagefind'

/**
 * `next build` prerenders app pages to `.next/server/app/**.html`. When a deployment adapter is
 * configured (Vercel sets `NEXT_ADAPTER_PATH`), Next 16.4+ instead writes each route's HTML to
 * `.next/server/route-cache/APP_PAGE/<sha256(source route)>/$/**.html`, with `$` as the URL root
 * (vercel/next.js#99482). Index every root that exists so search works locally, in CI and on
 * Vercel alike.
 */
const routeCacheDir = path.join('.next', 'server', 'route-cache', 'APP_PAGE')
const roots = [
  path.join('.next', 'server', 'app'),
  ...(existsSync(routeCacheDir)
    ? readdirSync(routeCacheDir).map((hash) => path.join(routeCacheDir, hash, '$'))
    : []),
]

const {index, errors} = await createIndex()
if (!index) throw new Error(errors.join('\n'))

const results = await Promise.all(
  roots.map(async (root) => ({root, ...(await index.addDirectory({path: root}))})),
)
const failures = results.flatMap((result) => result.errors)
if (failures.length > 0) throw new Error(failures.join('\n'))

const indexed = results.filter((result) => result.page_count > 0)
if (indexed.length === 0) {
  throw new Error(`Pagefind found no prerendered HTML in ${roots.join(', ')}`)
}

const written = await index.writeFiles({outputPath: path.join('public', '_pagefind')})
if (written.errors.length > 0) throw new Error(written.errors.join('\n'))
await close()

const summary = indexed.map((result) => `${result.page_count} from ${result.root}`).join(', ')
// oxlint-disable-next-line eslint/no-console
console.log(`Pagefind indexed ${summary} into ${written.outputPath}`)

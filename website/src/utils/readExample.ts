import fs from 'node:fs'
import path from 'node:path'

import {cache} from 'react'

/**
 * Read an example source file as a string for Sandpack (Turbopack-safe).
 *
 * `sourceDir` is relative to the repo root and defaults to the website's own examples folder.
 * The async-react example reads straight from the `async-react/` workspace this way.
 *
 * `cache` collapses the synchronous read to once per file per render. It deliberately does not
 * memoize across requests, so editing an example in dev still shows up on the next one.
 */
export const readExample = cache((sourceDir: string | undefined, ...segments: string[]): string =>
  fs.readFileSync(
    sourceDir
      ? path.join(process.cwd(), '..', sourceDir, ...segments)
      : path.join(process.cwd(), 'src/examples', ...segments),
    'utf8',
  ),
)

/**
 * Local react-rx build used by Sandpack in development. Every `ExampleSandpack` on a page asks for
 * it, so `cache` is what keeps that to a single read per render.
 */
export const readReactRxDist = cache((): string =>
  fs.readFileSync(path.join(process.cwd(), '../packages/react-rx/dist/index.js'), 'utf8'),
)

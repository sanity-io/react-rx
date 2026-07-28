import fs from 'node:fs'
import path from 'node:path'

/** Read an example source file as a string for Sandpack (Turbopack-safe). */
export function readExample(...segments: string[]): string {
  return fs.readFileSync(path.join(process.cwd(), 'src/examples', ...segments), 'utf8')
}

/** Local react-rx build used by Sandpack in development. */
export function readReactRxDist(): string {
  return fs.readFileSync(path.join(process.cwd(), '../packages/react-rx/dist/index.js'), 'utf8')
}

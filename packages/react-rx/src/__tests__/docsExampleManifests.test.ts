// @vitest-environment node
import {readFileSync} from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'

import {describe, expect, it} from 'vitest'

import {exampleManifests} from '../../../../website/src/examples/manifests'

const examplesDirectory = fileURLToPath(
  new URL('../../../../website/src/examples/', import.meta.url),
)

describe('documentation sandbox manifests', () => {
  it.each(Object.entries(exampleManifests))(
    '%s ships its entry and local imports',
    (name, manifest) => {
      expect(manifest.files).toHaveProperty('/App.tsx')
      const virtualPaths = new Set(Object.keys(manifest.files))

      for (const [sandboxPath, sourceFile] of Object.entries(manifest.files)) {
        const source = readFileSync(path.join(examplesDirectory, name, sourceFile), 'utf8')
        expect(source.trim().length).toBeGreaterThan(0)

        for (const [, specifier] of source.matchAll(/(?:from\s+|import\s*)['"](\.[^'"]+)['"]/g)) {
          if (!specifier) continue
          const relative = path.posix.normalize(
            path.posix.join(path.posix.dirname(sandboxPath.slice(1)), specifier),
          )
          expect(
            relative === '..' || relative.startsWith('../'),
            `${name}: ${sandboxPath} imports ${specifier} outside the exported example`,
          ).toBe(false)
          const resolved = `/${relative}`
          const candidates = [
            resolved,
            `${resolved}.ts`,
            `${resolved}.tsx`,
            `${resolved}/index.tsx`,
          ]
          expect(
            candidates.some((candidate) => virtualPaths.has(candidate)),
            `${name}: ${sandboxPath} imports ${specifier}, but that file is missing from the sandbox`,
          ).toBe(true)
        }
      }
    },
  )
})

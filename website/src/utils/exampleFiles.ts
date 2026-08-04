import {type ExampleManifest, exampleManifests, type ExampleName} from '@/examples/manifests'
import {readExample} from '@/utils/readExample'

/**
 * Resolves an example's manifest into files (path → source code). Shared between the rendered
 * sandboxes and the markdown exports so the two can never drift apart.
 */
export function getExampleFiles(example: ExampleName): Record<string, string> {
  const {files, transform, sourceDir}: ExampleManifest = exampleManifests[example]
  return Object.fromEntries(
    Object.entries(files).map(([sandpackPath, sourceFile]) => {
      const source = readExample(sourceDir, sourceDir ? sourceFile : `${example}/${sourceFile}`)
      return [sandpackPath, transform ? transform(source) : source]
    }),
  )
}

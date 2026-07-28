import {defineConfig} from '@sanity/tsdown-config'
import {mergeConfig} from 'tsdown'

export default mergeConfig(
  await defineConfig({
    tsconfig: 'tsconfig.build.json',
    entry: ['./src/index.ts'],
    format: ['esm', 'cjs'],
    reactCompiler: {target: '18'},
    // The `exports` map is hand-maintained so the published entry points, including the `source`
    // condition, stay exactly as they are.
    exports: false,
  }),
  {
    // Every export is a hook, so the whole bundle is client-only.
    outputOptions: {banner: `'use client';`},
  },
)

import {defineConfig} from '@sanity/tsdown-config'

export default defineConfig({
  tsconfig: 'tsconfig.build.json',
  entry: ['./src/index.ts'],
  format: ['esm', 'cjs'],
  reactCompiler: {target: '18'},
})

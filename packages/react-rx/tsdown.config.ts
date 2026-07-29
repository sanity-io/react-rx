import {defineConfig} from '@sanity/tsdown-config'
import type {UserConfig} from 'tsdown'

// `satisfies Promise<UserConfig>` names the return type through this package's own `tsdown`
// dependency. Without it, declaration emit can only reach the type through
// `@sanity/tsdown-config`'s copy, which is not portable (TS2883).
export default defineConfig({
  tsconfig: 'tsconfig.build.json',
  entry: ['./src/index.ts'],
  format: ['esm', 'cjs'],
  reactCompiler: {target: '19'},
}) satisfies Promise<UserConfig>

import {defineConfig} from '@sanity/pkg-utils'

export default defineConfig({
  tsconfig: 'tsconfig.build.json',
  extract: {
    rules: {
      'ae-incompatible-release-tags': 'warn',
      'ae-internal-missing-underscore': 'off',
    },
  },
  // react-rx is an RxJS integration library — consumers must supply a single shared
  // rxjs instance. Keeping it as a peer dependency is intentional.
  strictOptions: {
    noRxjsPeerDependency: 'off',
  },
  babel: {reactCompiler: true},
  reactCompilerOptions: {target: '18'},
  rollup: {
    output: {
      banner: () => {
        return `'use client';`
      },
    },
  },
})

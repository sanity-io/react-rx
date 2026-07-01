import {defineConfig} from '@sanity/pkg-utils'

export default defineConfig({
  tsconfig: 'tsconfig.build.json',
  extract: {
    rules: {
      'ae-forgotten-export': 'error',
      'ae-incompatible-release-tags': 'warn',
      'ae-internal-missing-underscore': 'off',
    },
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

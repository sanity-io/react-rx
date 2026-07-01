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
  strictOptions: {
    // rxjs is intentionally a peer dependency so consumers bring their own rxjs instance
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

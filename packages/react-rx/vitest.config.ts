import react from '@vitejs/plugin-react'
import {defineConfig} from 'vitest/config'

export default defineConfig({
  test: {
    setupFiles: ['vitest-cleanup-after-each.ts'],
    typecheck: {
      ignoreSourceErrors: true,
    },
    environment: 'jsdom',
    // Expose `globalThis.gc` in the worker processes so the memory-leak regression tests in
    // `useObservable.leaks.test.tsx` can force garbage collection.
    execArgv: ['--expose-gc'],
    projects: [
      {
        extends: true,
        plugins: [react()],
        test: {
          name: 'default',
          typecheck: {
            // The CLI `--typecheck` flag does not reach project configs, so the type
            // tests (`*.test-d.ts`) must be enabled here to actually run. Only this
            // project runs them — the react-compiler project only changes the runtime
            // transform, which type tests never see.
            enabled: true,
            ignoreSourceErrors: true,
          },
        },
      },
      {
        extends: true,
        // React Compiler on oxc (`oxc-transform-react`) — one native pass, no babel.
        plugins: [react({compiler: {target: '19'}})],
        test: {
          name: 'react-compiler',
        },
      },
      {
        extends: true,
        plugins: [react()],
        // The oldest React in the `^19.2` peer range. Some assertions only hold on one side of a
        // React change (e.g. React 19.3 retains `use()`d thenables after unmount, see
        // `useObservablePromise.leaks.test.tsx`), so the suite runs against both versions. The 19.2
        // copy is installed under the `react-19.2` / `react-dom-19.2` npm: aliases, paired by
        // `.pnpmfile.cjs` at the repo root.
        resolve: {
          alias: {
            // Vitest resolves @testing-library/react to its CJS entry, whose `require('react-dom')`
            // goes through Node and skips these aliases. Its ESM build is inlined by Vitest, so its
            // `react` / `react-dom` imports are rewritten to 19.2 as well.
            '@testing-library/react': '@testing-library/react/dist/@testing-library/react.esm.js',
            'react': 'react-19.2',
            'react-dom': 'react-dom-19.2',
          },
        },
        test: {
          name: 'react-19.2',
        },
      },
    ],
  },
})

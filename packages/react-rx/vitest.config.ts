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
    ],
  },
})

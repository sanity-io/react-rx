import react from '@vitejs/plugin-react'
import {defineConfig} from 'vitest/config'

export default defineConfig({
  test: {
    setupFiles: ['vitest-cleanup-after-each.ts'],
    typecheck: {
      ignoreSourceErrors: true,
    },
    environment: 'jsdom',
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
        plugins: [
          react({
            babel: {plugins: [['babel-plugin-react-compiler', {target: '18'}]]},
          }),
        ],
        test: {
          name: 'react-compiler',
        },
      },
    ],
  },
})

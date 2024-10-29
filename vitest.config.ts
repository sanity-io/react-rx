import react from '@vitejs/plugin-react'
import {defineConfig} from 'vitest/config'

export default defineConfig({
  plugins: [
    react({
      babel: {plugins: [['babel-plugin-react-compiler', {target: '18'}]]},
    }),
  ],
  test: {
    typecheck: {
      ignoreSourceErrors: true,
    },
    environment: 'jsdom',
  },
})

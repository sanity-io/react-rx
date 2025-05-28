import react from '@vitejs/plugin-react'
import {defineWorkspace} from 'vitest/config'

// defineWorkspace provides a nice type hinting DX
export default defineWorkspace([
  {
    extends: './vitest.config',
    plugins: [react()],
    test: {
      name: 'default',
    },
  },
  {
    extends: './vitest.config',
    plugins: [
      react({
        babel: {plugins: [['babel-plugin-react-compiler', {target: '18'}]]},
      }),
    ],
    test: {
      name: 'react-compiler',
    },
  },
])

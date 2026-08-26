import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import {defineConfig} from 'vite'

export default defineConfig({
  plugins: [react({compiler: true}), tailwindcss()],
  resolve: {
    tsconfigPaths: true,
    // react-rx compiles from workspace source; its sibling node_modules has
    // its own react/rxjs copies (the library's devDeps), while this app runs
    // react@canary. Dedupe so the bundle carries exactly one of each.
    dedupe: ['react', 'react-dom', 'rxjs'],
  },
})

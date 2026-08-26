import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import {defineConfig} from 'vite'

export default defineConfig({
  plugins: [react({compiler: true}), tailwindcss()],
  resolve: {
    tsconfigPaths: true,
  },
})

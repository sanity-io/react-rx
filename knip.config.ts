import type {KnipConfig} from 'knip'

const config: KnipConfig = {
  workspaces: {
    '.': {},
    'async-react': {
      entry: ['src/main.tsx', 'src/debugger.ts', 'vite.config.ts'],
      project: ['src/**/*.{ts,tsx}', 'vite.config.ts'],
      paths: {'@/*': ['./src/*']},
      ignoreDependencies: ['tailwindcss', 'tw-animate-css'],
    },
    'packages/react-rx': {
      entry: [
        'src/index.ts',
        'vitest.config.ts',
        'tsdown.config.ts',
        'vitest-cleanup-after-each.ts',
      ],
      project: ['src/**/*.{ts,tsx}', '*.{ts,tsx}'],
    },
    'website': {
      entry: [
        'src/app/**/*.{ts,tsx}',
        // Nextra sidebar/meta config (not imported; discovered by convention)
        'src/content/**/_meta.ts',
        // Sandpack example sources are loaded via `readExample` (fs), not imports
        'src/examples/**/*.{ts,tsx}',
        'next.config.ts',
      ],
      project: ['**/*.{ts,tsx,js,jsx}'],
      paths: {'@/*': ['./src/*']},
    },
  },
}

export default config

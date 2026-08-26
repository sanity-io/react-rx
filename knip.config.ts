import type {KnipConfig} from 'knip'

const config: KnipConfig = {
  ignoreIssues: {
    'async-react/src/components/ui/**': ['exports'],
    'async-react/src/data/debug.jsx': ['exports'],
    'async-react/src/design/**': ['exports'],
  },
  workspaces: {
    '.': {},
    'async-react': {
      entry: ['src/main.jsx', 'server.js', 'vite.config.js'],
      project: ['src/**/*.{js,jsx,ts,tsx}', '*.{js,ts}'],
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

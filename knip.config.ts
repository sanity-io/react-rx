import type {KnipConfig} from 'knip'

const config: KnipConfig = {
  // Vendored fork of rickhanlonii/async-react via git subtree. Keep it out of
  // the monorepo knip graph; it is not a workspace member.
  ignore: ['async-react/**'],
  workspaces: {
    '.': {},
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

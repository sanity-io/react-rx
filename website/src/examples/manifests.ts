import websitePackageJson from '../../package.json'

/**
 * Central manifest for every interactive example. It records which source files an example ships
 * to Sandpack (keyed by the path shown in the sandbox) and which extra npm dependencies it needs.
 *
 * Both the rendered sandboxes (`ExampleSandpack`) and the agent-friendly markdown (the "Copy page"
 * button, `/llms.txt` and `/llms-full.txt`) are derived from this map, so the markdown always
 * matches what the sandboxes actually run.
 */
export interface ExampleManifest {
  /** Sandpack file path (e.g. `/App.tsx`) → source file inside `src/examples/<name>`. */
  files: Record<string, string>
  /**
   * Directory the source files live in, relative to the repo root. Defaults to the website's
   * own `src/examples/<name>` folder. The async-react example reads the `async-react/`
   * workspace directly this way (its demo is embedded as a built app rather than a sandbox,
   * but the markdown exports still carry these sources).
   */
  sourceDir?: string
  /** Extra npm dependencies for the sandbox. Versions are resolved from the website's own deps. */
  dependencies?: Partial<
    Record<
      keyof typeof websitePackageJson.dependencies,
      'latest'
    >
  >
  /** Optional post-processing applied to each file, both in Sandpack and in exported markdown. */
  transform?: (source: string) => string
}

export const exampleManifests = {
  'activity': {
    files: {
      '/App.tsx': 'App.tsx',
      '/TabPanel.tsx': 'TabPanel.tsx',
      '/api.ts': 'api.ts',
    },
  },
  'async-react': {
    // The forked React Conf 2025 demo (the `async-react/` workspace). The
    // docs page embeds the built app; these sources feed the markdown
    // exports ("Copy page", /llms-full.txt).
    sourceDir: 'async-react',
    files: {
      '/src/main.jsx': 'src/main.jsx',
      '/src/app/Home.jsx': 'src/app/Home.jsx',
      '/src/app/Login.jsx': 'src/app/Login.jsx',
      '/src/data/index.js': 'src/data/index.js',
      '/src/data/debug.jsx': 'src/data/debug.jsx',
      '/src/data/fake-data.js':
        'src/data/fake-data.js',
      '/src/router/index.jsx':
        'src/router/index.jsx',
      '/src/design/index.jsx':
        'src/design/index.jsx',
      '/src/design/Button.jsx':
        'src/design/Button.jsx',
      '/src/design/PendingButton.jsx':
        'src/design/PendingButton.jsx',
      '/src/design/CompleteButton.jsx':
        'src/design/CompleteButton.jsx',
      '/src/design/SearchInput.jsx':
        'src/design/SearchInput.jsx',
      '/src/design/TabList.jsx':
        'src/design/TabList.jsx',
      '/src/design/ButtonShimmer.jsx':
        'src/design/ButtonShimmer.jsx',
      '/src/design/Lesson.jsx':
        'src/design/Lesson.jsx',
      '/src/design/LoginForm.jsx':
        'src/design/LoginForm.jsx',
      '/src/design/Fallback.jsx':
        'src/design/Fallback.jsx',
      '/src/design/EmptyList.jsx':
        'src/design/EmptyList.jsx',
      '/src/design/Card.jsx':
        'src/design/Card.jsx',
    },
  },
  'checkbox': {
    files: {'/App.tsx': 'App.tsx'},
  },
  'clicks-bridge': {
    files: {'/App.tsx': 'App.tsx'},
  },
  'clicks-count': {
    files: {'/App.tsx': 'App.tsx'},
  },
  'clicks-throttle': {
    files: {'/App.tsx': 'App.tsx'},
  },
  'clicks-values': {
    files: {'/App.tsx': 'App.tsx'},
  },
  'context': {
    files: {
      '/App.tsx': 'App.tsx',
      '/ModeSwitcher.tsx': 'ModeSwitcher.tsx',
      '/context.tsx': 'context.tsx',
    },
  },
  'data-fetching': {
    files: {
      '/App.tsx': 'DataFetchingExample.tsx',
    },
  },
  'errors': {
    files: {
      '/App.tsx': 'App.tsx',
      '/Example.tsx': 'Example.tsx',
      '/Counter.tsx': 'Counter.tsx',
    },
    dependencies: {
      'use-error-boundary': 'latest',
    },
  },
  'fetch': {
    files: {'/App.tsx': 'FetchExample.tsx'},
    transform: (source) =>
      source.replace(
        'http://localhost:3000',
        process.env.NEXT_PUBLIC_VERCEL_BRANCH_URL
          ? `https://${process.env.NEXT_PUBLIC_VERCEL_BRANCH_URL}`
          : 'https://react-rx.sanity.dev',
      ),
  },
  'form': {
    files: {'/App.tsx': 'App.tsx'},
  },
  'form-data': {
    files: {
      '/App.tsx': 'FormDataExample.tsx',
      '/storage.ts': 'storage.ts',
    },
  },
  'interval-observable': {
    files: {'/App.tsx': 'App.tsx'},
  },
  'llm-chat': {
    files: {
      '/App.tsx': 'App.tsx',
      '/chat.ts': 'chat.ts',
      '/llm.ts': 'llm.ts',
    },
  },
  'resilient-fetch': {
    files: {
      '/App.tsx': 'App.tsx',
      '/api.ts': 'api.ts',
    },
  },
  'search': {
    files: {'/App.tsx': 'SearchExample.tsx'},
  },
  'suspense': {
    files: {'/App.tsx': 'SuspenseExample.tsx'},
  },
  'text-field': {
    files: {'/App.tsx': 'App.tsx'},
  },
  'time-ago': {
    files: {
      '/App.tsx': 'App.tsx',
      '/timeAgo.ts': 'timeAgo.ts',
    },
  },
  'time-ago-ssr': {
    files: {
      '/App.tsx': 'App.tsx',
      '/Message.tsx': 'Message.tsx',
      '/timeAgo.ts': 'timeAgo.ts',
    },
  },
  'todo-app': {
    files: {'/App.tsx': 'TodoApp.example.tsx'},
  },
  'use-interval': {
    files: {'/App.tsx': 'App.tsx'},
  },
} satisfies Record<string, ExampleManifest>

export type ExampleName =
  keyof typeof exampleManifests

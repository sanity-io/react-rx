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
    files: {
      '/App.tsx': 'App.tsx',
      '/Home.tsx': 'Home.tsx',
      '/Login.tsx': 'Login.tsx',
      '/design.tsx': 'design.tsx',
      '/api.ts': 'api.ts',
      '/router.tsx': 'router.tsx',
      '/NetworkDebugger.tsx':
        'NetworkDebugger.tsx',
      '/server.ts': 'server.ts',
      '/demo.css': 'demo.css',
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

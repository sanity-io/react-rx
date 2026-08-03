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
  'event-handlers': {
    files: {
      '/App.tsx': 'EventHandlersExample.tsx',
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
  'fizz-buzz': {
    files: {'/App.tsx': 'FizzBuzzExample.tsx'},
  },
  'form-data': {
    files: {
      '/App.tsx': 'FormDataExample.tsx',
      '/storage.ts': 'storage.ts',
    },
    dependencies: {'styled-components': 'latest'},
  },
  'hello-world': {
    files: {'/App.tsx': 'HelloWorldExample.tsx'},
  },
  'llm-chat': {
    files: {
      '/App.tsx': 'App.tsx',
      '/chat.ts': 'chat.ts',
      '/llm.ts': 'llm.ts',
    },
  },
  'reactive-state': {
    files: {
      '/App.tsx': 'ReactiveStateExample.tsx',
    },
  },
  'relative-time': {
    files: {'/App.tsx': 'RelativeTimeExample.tsx'},
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
  'simple': {
    files: {'/App.tsx': 'Counter.example.tsx'},
  },
  'suspense': {
    files: {'/App.tsx': 'SuspenseExample.tsx'},
  },
  'sync': {
    files: {'/App.tsx': 'Sync.example.tsx'},
  },
  'tick': {
    files: {
      '/App.tsx': 'TickExample.tsx',
      './Ticker.tsx': 'Ticker.tsx',
      './TickerWithSubTick.tsx':
        'TickerWithSubTick.tsx',
    },
  },
  'todo-app': {
    files: {'/App.tsx': 'TodoApp.example.tsx'},
    dependencies: {'styled-components': 'latest'},
  },
} satisfies Record<string, ExampleManifest>

export type ExampleName =
  keyof typeof exampleManifests

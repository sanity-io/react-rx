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
  'basic-state': {
    files: {
      '/App.tsx': 'App.tsx',
      '/TextField.tsx': 'TextField.tsx',
      '/Checkbox.tsx': 'Checkbox.tsx',
      '/NameForm.tsx': 'NameForm.tsx',
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
  'form-data': {
    files: {
      '/App.tsx': 'FormDataExample.tsx',
      '/storage.ts': 'storage.ts',
    },
    dependencies: {'styled-components': 'latest'},
  },
  'search': {
    files: {'/App.tsx': 'SearchExample.tsx'},
  },
  'resilient-fetch': {
    files: {
      '/App.tsx': 'App.tsx',
      '/request.ts': 'request.ts',
    },
  },
  'simple': {
    files: {
      '/App.tsx': 'App.tsx',
      '/ManualCounter.tsx': 'ManualCounter.tsx',
      '/ReactRxCounter.tsx': 'ReactRxCounter.tsx',
    },
  },
  'streaming-chat': {
    files: {
      '/App.tsx': 'App.tsx',
      '/Conversation.tsx': 'Conversation.tsx',
      '/stream.ts': 'stream.ts',
    },
  },
  'suspense': {
    files: {'/App.tsx': 'SuspenseExample.tsx'},
  },
  'sync': {
    files: {
      '/App.tsx': 'App.tsx',
      '/ReactTimer.tsx': 'ReactTimer.tsx',
      '/RxTimer.tsx': 'RxTimer.tsx',
      '/useInterval.ts': 'useInterval.ts',
    },
  },
  'time-ago': {
    files: {
      '/App.tsx': 'App.tsx',
      '/TimeAgo.tsx': 'TimeAgo.tsx',
      '/selectUnit.ts': 'selectUnit.ts',
    },
  },
  'time-ago-ssr': {
    files: {
      '/App.tsx': 'App.tsx',
      '/LiveClock.tsx': 'LiveClock.tsx',
      '/selectUnit.ts': 'selectUnit.ts',
    },
  },
  'todo-app': {
    files: {'/App.tsx': 'TodoApp.example.tsx'},
    dependencies: {'styled-components': 'latest'},
  },
  'transitions': {
    files: {
      '/App.tsx': 'App.tsx',
      '/ProfileCard.tsx': 'ProfileCard.tsx',
      '/api.ts': 'api.ts',
    },
  },
} satisfies Record<string, ExampleManifest>

export type ExampleName =
  keyof typeof exampleManifests

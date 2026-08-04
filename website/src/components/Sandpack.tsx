'use client'

import {Sandpack} from '@codesandbox/sandpack-react'
import {atomDark, githubLight} from '@codesandbox/sandpack-themes'
import {useTheme} from 'nextra-theme-docs'
import {type ComponentProps, useMemo} from 'react'

import reactRxPackageJson from '../../../packages/react-rx/package.json'
import websitePackageJson from '../../package.json'

const {dependencies: websiteDependencies} = websitePackageJson

const EMPTY_FILES = {}

/**
 * Shared styling for every example preview. Pico (class-less) styles semantic HTML directly, so
 * example sources stay free of styling imports and class names. It is injected as a stylesheet
 * `<link>` in the preview iframe (`externalResources`), bypassing the sandbox bundler entirely.
 */
const PICO_CSS_URL = 'https://cdn.jsdelivr.net/npm/@picocss/pico@2/css/pico.fluid.classless.min.css'

/**
 * Hidden entry: renders the example's default export and pulls in the shared tuning stylesheet.
 * Keeps `/App.tsx` as the file visitors see and edit.
 */
const ENTRY_FILE = `import {createRoot} from 'react-dom/client'

import './styles.css'
import App from './App'

createRoot(document.getElementById('root')!).render(<App />)
`

/**
 * Narrow-pane tuning on top of Pico. The preview pane is ~34% of the docs content column
 * (roughly 280–360px wide), so examples are designed mobile-first: reduced type scale and
 * spacing, and guardrails against horizontal overflow.
 */
const STYLES_FILE = `:root {
  --pico-font-size: 87.5%;
  --pico-font-family: system-ui, sans-serif;
  --pico-spacing: 0.75rem;
  --pico-typography-spacing-vertical: 0.75rem;
  --pico-form-element-spacing-vertical: 0.4rem;
  --pico-form-element-spacing-horizontal: 0.6rem;
  --pico-block-spacing-vertical: 0.75rem;
  --pico-block-spacing-horizontal: 0.75rem;
}

body {
  padding: var(--pico-spacing);
}

* {
  min-width: 0;
}

img,
video,
table,
pre,
code {
  max-width: 100%;
}

pre,
code {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
`

export default function SandpackComponent({
  files = EMPTY_FILES,
  dependencies = null,
  reactRxSource,
}: Pick<ComponentProps<typeof Sandpack>, 'files'> & {
  dependencies?: Partial<Record<keyof typeof websiteDependencies, 'latest'>> | null
  /** Local react-rx build injected into Sandpack in development. */
  reactRxSource?: string
}) {
  const {resolvedTheme} = useTheme()
  const extraDependencies = useMemo(() => {
    const result = {}
    if (!dependencies) return result
    for (const [name] of Object.entries(dependencies)) {
      if (websiteDependencies[name]) {
        result[name] = websiteDependencies[name]
      }
    }
    return result
  }, [dependencies])

  return (
    <Sandpack
      template="vite-react-ts"
      options={{
        editorHeight: '60vh',
        editorWidthPercentage: 66,
        externalResources: [PICO_CSS_URL],
        showConsoleButton: true,
        showLineNumbers: true,
        showInlineErrors: true,
        wrapContent: true,
      }}
      theme={resolvedTheme === 'dark' ? atomDark : githubLight}
      files={{
        ...(files as any),
        '/index.tsx': {hidden: true, code: ENTRY_FILE},
        '/styles.css': {hidden: true, code: STYLES_FILE},
        /**
         * In production we should always use the package on npm, which supports canaries
         * while locally we use the build package
         */
        ...(reactRxSource
          ? {
              '/node_modules/react-rx/package.json': {
                hidden: true,
                code: JSON.stringify({
                  name: 'react-rx',
                  type: 'module',
                  main: './index.js',
                }),
              },
              '/node_modules/react-rx/index.js': {
                hidden: true,
                code: reactRxSource,
              },
            }
          : {}),
      }}
      customSetup={{
        entry: '/index.tsx',
        dependencies: {
          /**
           * In production we should always use the package on npm, which supports canaries
           * while locally we use the build package
           */
          ...(reactRxSource
            ? reactRxPackageJson.dependencies
            : {'react-rx': reactRxPackageJson.version}),
          'rxjs': reactRxPackageJson.peerDependencies.rxjs,
          'react': reactRxPackageJson.devDependencies.react,
          'react-dom': reactRxPackageJson.devDependencies['react-dom'],
          '@types/react': reactRxPackageJson.devDependencies['@types/react'],
          '@types/react-dom': reactRxPackageJson.devDependencies['@types/react-dom'],
          ...extraDependencies,
        },
      }}
    />
  )
}

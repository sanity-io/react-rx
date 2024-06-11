import {Sandpack} from '@codesandbox/sandpack-react'
import {atomDark, githubLight} from '@codesandbox/sandpack-themes'
import {useTheme} from 'nextra-theme-docs'
import {type ComponentProps, useMemo} from 'react'
import {useErrorBoundary} from 'use-error-boundary'

import reactRxRaw from '../../../dist/index.js?raw'
import reactRxPackageJson from '../../../package.json'
import websitePackageJson from '../../package.json'

const {dependencies: websiteDependencies} = websitePackageJson

export default function SandpackComponent({
  files = {},
  dependencies = null,
  useOldReactRx = false,
}: Pick<ComponentProps<typeof Sandpack>, 'files'> & {
  dependencies?: Partial<Record<keyof typeof websiteDependencies, 'latest'>> | null
  /**
   * Temporary, needed for legacy `rxComponent` APIs
   */
  useOldReactRx?: boolean
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
  const {ErrorBoundary, didCatch, error, reset} = useErrorBoundary()

  return (
    <ErrorBoundary>
      <Sandpack
        template="vite-react-ts"
        options={{
          editorHeight: '75vh',
          editorWidthPercentage: 66,
          showConsoleButton: true,
          showInlineErrors: true,
          showLineNumbers: true,
          wrapContent: true,
        }}
        theme={resolvedTheme === 'dark' ? atomDark : githubLight}
        files={{
          ...(files as any),
          /**
           * In production we should always use the package on npm, which supports canaries
           * while locally we use the build package
           */
          ...(process.env.NODE_ENV === 'development'
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
                  code: reactRxRaw,
                },
              }
            : {}),
        }}
        customSetup={{
          entry: '/App.tsx',
          dependencies: {
            /**
             * In production we should always use the package on npm, which supports canaries
             * while locally we use the build package
             */
            ...(process.env.NODE_ENV === 'development'
              ? {}
              : {'react-rx': reactRxPackageJson.version}),
            ...reactRxPackageJson.dependencies,
            rxjs: reactRxPackageJson.peerDependencies.rxjs,
            ...extraDependencies,
            ...(useOldReactRx
              ? {'react-rx-old': websitePackageJson.dependencies['react-rx-old']}
              : {}),
          },
        }}
      />
    </ErrorBoundary>
  )
}

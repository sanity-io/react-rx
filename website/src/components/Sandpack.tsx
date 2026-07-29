'use client'

import {Sandpack} from '@codesandbox/sandpack-react'
import {atomDark, githubLight} from '@codesandbox/sandpack-themes'
import {useTheme} from 'nextra-theme-docs'
import {type ComponentProps, useMemo} from 'react'

import reactRxPackageJson from '../../../packages/react-rx/package.json'
import websitePackageJson from '../../package.json'

const {dependencies: websiteDependencies} = websitePackageJson

const EMPTY_FILES = {}

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
        showConsoleButton: true,
        showLineNumbers: true,
        showInlineErrors: true,
        wrapContent: true,
      }}
      theme={resolvedTheme === 'dark' ? atomDark : githubLight}
      files={{
        ...(files as any),
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
        entry: '/App.tsx',
        dependencies: {
          /**
           * In production we should always use the package on npm, which supports canaries
           * while locally we use the build package
           */
          ...(reactRxSource ? {} : {'react-rx': reactRxPackageJson.version}),
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

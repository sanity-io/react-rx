import {Sandpack} from '@codesandbox/sandpack-react'
import {githubLight} from '@codesandbox/sandpack-themes'
import type {ComponentProps} from 'react'

import reactRxRaw from '../../../dist/index.js?raw'
import reactRxPackageJson from '../../../package.json'

export default function SandpackComponent({
  files = {},
  dependencies = {},
}: Pick<ComponentProps<typeof Sandpack>, 'files'> & {
  dependencies?: Record<string, string>
}) {
  return (
    <Sandpack
      template="vite-react-ts"
      theme={githubLight}
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
          ...dependencies,
        },
      }}
    />
  )
}

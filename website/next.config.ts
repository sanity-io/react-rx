import {createRequire} from 'node:module'

import type {NextConfig} from 'next'
import nextra from 'nextra'

const require = createRequire(import.meta.url)

const withNextra = nextra({
  defaultShowCopyCode: true,
})

function excludeRawQuery(rule: unknown): void {
  if (!rule || typeof rule !== 'object') return
  const r = rule as {
    oneOf?: unknown[]
    rules?: unknown[]
    resourceQuery?: unknown
    test?: unknown
    use?: unknown
    loader?: unknown
  }

  if (Array.isArray(r.oneOf)) {
    for (const child of r.oneOf) excludeRawQuery(child)
    return
  }
  if (Array.isArray(r.rules)) {
    for (const child of r.rules) excludeRawQuery(child)
  }

  const usesSwc =
    (typeof r.loader === 'string' && r.loader.includes('swc')) ||
    (Array.isArray(r.use) &&
      r.use.some(
        (entry) =>
          typeof entry === 'string'
            ? entry.includes('swc')
            : entry &&
              typeof entry === 'object' &&
              'loader' in entry &&
              typeof (entry as {loader?: string}).loader === 'string' &&
              (entry as {loader: string}).loader.includes('swc'),
      ))

  if (!usesSwc && r.test == null) return
  if (!usesSwc && r.test != null) {
    const testStr = String(r.test)
    if (!/\.(tsx?|jsx?)/.test(testStr) && !testStr.includes('js|') && !testStr.includes('ts|')) {
      return
    }
  }

  // Ensure SWC/JS rules never claim ?raw modules.
  if (r.resourceQuery == null) {
    r.resourceQuery = {not: [/raw/]}
  }
}

const nextConfig = {
  compiler: {
    styledComponents: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  productionBrowserSourceMaps: true,
  transpilePackages: ['react-rx'],
  webpack(config) {
    config.resolve.alias = {
      ...config.resolve.alias,
      'react-rx': require.resolve('../packages/react-rx/src/index.ts'),
    }

    for (const rule of config.module.rules) {
      excludeRawQuery(rule)
    }

    // Prefer exclusive match inside each oneOf; also keep a top-level fallback.
    for (const rule of config.module.rules) {
      if (rule && typeof rule === 'object' && Array.isArray((rule as {oneOf?: unknown[]}).oneOf)) {
        ;(rule as {oneOf: unknown[]}).oneOf.unshift({
          resourceQuery: /raw/,
          type: 'asset/source',
        })
      }
    }
    config.module.rules.unshift({
      resourceQuery: /raw/,
      type: 'asset/source',
    })

    return config
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Accept-CH',
            value: 'Sec-CH-Prefers-Color-Scheme',
          },
          {
            key: 'Vary',
            value: 'Sec-CH-Prefers-Color-Scheme',
          },
          {
            key: 'Critical-CH',
            value: 'Sec-CH-Prefers-Color-Scheme',
          },
        ],
      },
      {
        // matching all API routes
        source: '/fetch/:path*',
        headers: [{key: 'Access-Control-Allow-Origin', value: '*'}],
      },
    ]
  },
} satisfies NextConfig

export default withNextra(nextConfig)

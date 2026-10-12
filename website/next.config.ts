import type {NextConfig} from 'next'
import nextra from 'nextra'

const withNextra = nextra({
  defaultShowCopyCode: true,
})

const nextConfig = {
  compiler: {
    styledComponents: true,
  },
  // Native React Compiler via Turbopack (no babel-plugin-react-compiler).
  reactCompiler: true,
  experimental: {
    turbopackRustReactCompiler: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  productionBrowserSourceMaps: true,
  transpilePackages: ['react-rx'],
  async redirects() {
    return [
      {source: '/examples/event-handlers', destination: '/examples/simple', permanent: true},
      {source: '/examples/hello-world', destination: '/examples/simple', permanent: true},
      {source: '/examples/animation', destination: '/examples/streaming-chat', permanent: true},
      {source: '/examples/relative-time', destination: '/examples/sync', permanent: true},
      {source: '/examples/tick', destination: '/examples/sync', permanent: true},
      {source: '/examples/fizz-buzz', destination: '/examples/sync', permanent: true},
      {source: '/examples/reactive-state', destination: '/examples/sync', permanent: true},
    ]
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

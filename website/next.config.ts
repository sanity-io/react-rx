import type {NextConfig} from 'next'
import nextra from 'nextra'

const withNextra = nextra({
  defaultShowCopyCode: true,
})

const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  productionBrowserSourceMaps: true,
  transpilePackages: ['react-rx'],
  async redirects() {
    // Example pages that moved during the docs restructuring.
    return [
      {source: '/examples/animation', destination: '/examples/llm-chat', permanent: false},
      {source: '/examples/counters', destination: '/examples/timers', permanent: false},
      {source: '/examples/sync', destination: '/examples/timers', permanent: false},
      {source: '/examples/relative-time', destination: '/examples/timers', permanent: false},
      {source: '/examples/event-handlers', destination: '/examples/simple', permanent: false},
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

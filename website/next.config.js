const withNextra = require('nextra')({
  theme: 'nextra-theme-docs',
  themeConfig: './theme.config.jsx',
  defaultShowCopyCode: true,
})

/** @type {import('next').NextConfig} */
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
      'react-rx': require.resolve('../src/index.ts'),
    }
    config.module.rules.push({
      test: /\.(js|ts)x?$/,
      resourceQuery: /raw/,
      use: 'raw-loader',
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
}

module.exports = withNextra(nextConfig)

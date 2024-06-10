const emoji = require('remark-emoji')
const slug = require('remark-slug')

/** @type {import('@next/mdx').NextMDXOptions} */
const mdxConfig = {
  extension: /\.mdx?$/,
  options: {
    remarkPlugins: [emoji, slug],
  },
}
const withMDX = require('@next/mdx')(mdxConfig)

/** @type {import('next').NextConfig} */
const nextConfig = {
  compiler: {
    styledComponents: true,
  },
  pageExtensions: ['ts', 'tsx', 'js', 'jsx', 'md', 'mdx'],
  productionBrowserSourceMaps: true,
  transpilePackages: ['react-rx'],
  webpack(config) {
    config.resolve.alias = {
      ...config.resolve.alias,
      'react-rx': require.resolve('../src/index.ts'),
    }
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
    ]
  },
}

module.exports = withMDX(nextConfig)

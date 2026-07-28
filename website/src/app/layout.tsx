import 'nextra-theme-docs/style.css'
import './global.css'

import type {Metadata, Viewport} from 'next'
import {Head} from 'nextra/components'
import {getPageMap} from 'nextra/page-map'
import {Footer, Layout, Navbar} from 'nextra-theme-docs'
import type {ReactNode} from 'react'

import {ReactRxLogo} from '@/components/logos/ReactRxLogo'

export const metadata: Metadata = {
  title: {
    default: 'ReactRx',
    template: '%s – ReactRx',
  },
  description: 'Hooks for combining React with RxJS Observables',
  icons: {
    icon: [{url: '/icon.svg', type: 'image/svg+xml'}],
  },
}

export const viewport: Viewport = {
  themeColor: [
    {media: '(prefers-color-scheme: light)', color: '#fff'},
    {media: '(prefers-color-scheme: dark)', color: '#111'},
  ],
}

const navbar = (
  <Navbar
    logo={
      <span>
        <ReactRxLogo
          size="2em"
          style={{
            paddingRight: '0.6em',
            transform: 'scale(1.8) translateY(10%)',
            transformOrigin: 'center center',
          }}
        />
        ReactRx
      </span>
    }
    projectLink="https://github.com/sanity-io/react-rx"
  />
)

const footer = (
  <Footer>
    MIT {new Date().getFullYear()} ©{' '}
    <a href="https://sanity.io" target="_blank" rel="noreferrer">
      Sanity
    </a>
    .
  </Footer>
)

export default async function RootLayout({children}: {children: ReactNode}) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <Head
        color={{
          hue: {dark: 304, light: 339.63},
          saturation: {dark: 41, light: 68.07},
        }}
      />
      <body>
        <Layout
          navbar={navbar}
          pageMap={await getPageMap()}
          docsRepositoryBase="https://github.com/sanity-io/react-rx/tree/current/website"
          footer={footer}
        >
          {children}
        </Layout>
      </body>
    </html>
  )
}

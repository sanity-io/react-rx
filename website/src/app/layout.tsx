import type {Metadata} from 'next'
import {headers} from 'next/headers'

import {GlobalStyle} from './GlobalStyle'
import {StyledComponentsRegistry} from './registry'

const defaultTitle = 'ReactRx'

export const metadata = {
  title: {
    template: `%s | ${defaultTitle}`,
    default: defaultTitle,
  },
} satisfies Metadata

export default function RootLayout({children}: {children: React.ReactNode}) {
  const headersList = headers()
  const scheme = headersList.get('sec-ch-prefers-color-scheme')

  return (
    <html lang="en">
      <body data-scheme={scheme}>
        <StyledComponentsRegistry>
          <GlobalStyle />
          {children}
        </StyledComponentsRegistry>
      </body>
    </html>
  )
}

import type {Metadata} from 'next'
import {headers} from 'next/headers'

import {GlobalStyle} from '@/app/GlobalStyle'
import {StyledComponentsRegistry} from '@/app/registry'
import {Container} from '@/app/styles'
import {Header} from '@/components/Header'

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
          <Header />
          <Container>{children}</Container>
        </StyledComponentsRegistry>
      </body>
    </html>
  )
}

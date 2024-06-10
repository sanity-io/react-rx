'use client'

import Link from 'next/link'
import {usePathname} from 'next/navigation'
import {styled} from 'styled-components'

import {COLORS} from '@/theme'

import {GithubLogo} from './logos/Github'
import {ReactRxLogo} from './logos/ReactRxLogo'

const pages = [
  {title: 'Guide', href: '/guide'},
  {title: 'API', href: '/api'},
  {title: 'Examples', href: '/examples'},
] as const satisfies {title: string; href: string}[]

export function Header() {
  const pathname = usePathname()
  return (
    <StyledHeader>
      <HeaderInner>
        <Logo />
        {pages.map((page) => {
          return (
            <LinkWrapper key={page.href}>
              <PageLink href={page.href} $isActive={page.href.startsWith(pathname)}>
                {page.title}
              </PageLink>
            </LinkWrapper>
          )
        })}
        <a href="https://github.com/sanity-io/react-rx">
          <GithubLogo style={{color: '#fff'}} height="25" width="25" />
        </a>
      </HeaderInner>
    </StyledHeader>
  )
}

const StyledHeader = styled.header`
  z-index: 2000;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  padding-bottom: 0;
  background: ${COLORS.header.background};
  a,
  a:link,
  a:visited {
    color: ${COLORS.header.text};
  }
`

const HeaderInner = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  height: 5em;
  padding: 0.5em 1em 0.5em 1em;
  background-color: ${COLORS.header.background};
`

const LinkWrapper = styled.div`
  color: #efefef;
  padding: 0.5em 1.2em 0.5em 0;
`

const LogoWrapper = styled.div`
  font-family: Roboto, 'Helvetica Neue Light', 'Helvetica Neue', Helvetica, Arial, 'Lucida Grande',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  font-weight: bold;
  font-size: 1.3em;
  display: flex;
  flex-grow: 1;
  align-items: center;
`
const Logo = () => (
  <LogoWrapper>
    <Link href="/">
      <ReactRxLogo size="2em" style={{paddingRight: '0.4em'}} />
      ReactRx
    </Link>
  </LogoWrapper>
)

const PageLink = styled(Link)<{
  $isActive: boolean
}>`
  display: block;
  color: ${COLORS.text};
  font-size: 1em;
  &:link,
  &:visited {
    color: ${COLORS.text};
    text-decoration: ${(props) => props.$isActive && `underline`};
  }
`

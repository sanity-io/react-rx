import {Link} from './Link'
import * as React from 'react'
import styled from 'styled-components'
import {reactiveComponent} from '../../src/reactiveComponent'
import {pages} from '../pages/pages'
import {map} from 'rxjs/operators'
import {RxJSLogo} from './logos/rxjs'
import {ReactLogo} from './logos/react'
import {GithubLogo} from './logos/Github'
import {media} from '../theme'

const StyledHeader = styled.header`
  ${media.between('xsmall', 'small')} {
    font-size: 12px;
  }
  ${media.between('small', 'medium')} {
    font-size: 14px;
  }
  ${media.greaterThan('medium')} {
    font-size: 18px;
  }
  height: 5em;
  z-index: 2000;
  position: fixed;
  width: 100%;
  top: 0;
  left: 0;
  right: 0;
  padding-bottom: 0;
  background: #d9376e;
  a,
  a:link,
  a:visited {
    color: #eff0f3;
  }
`

const HeaderInner = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  height: 5em;
  padding: 0 2em 1.2em 2em;
  background-color: #d9376e;
`

const LinkWrapper = styled.div`
  color: #efefef;
  padding: 0.5em 1.6em 0.5em 0;
`

const PageLink = styled(Link)`
  display: block;
  color: #eff0f3;
  font-size: 1em;
  &:link,
  &:visited {
    color: #eff0f3;
  }
`

const LOGO_STYLE = `
  height: 2em;
  opacity: 0.7;
  position: absolute;
`
const StyledReactLogo = styled(ReactLogo)`
  ${LOGO_STYLE}
`
const StyledRxJSLogo = styled(RxJSLogo)`
  ${LOGO_STYLE}
`

const LogoWrapper = styled.div`
  font-family: Roboto, 'Helvetica Neue Light', 'Helvetica Neue', Helvetica,
    Arial, 'Lucida Grande', sans-serif;
  -webkit-font-smoothing: antialiased;
  font-weight: bold;
  font-size: 1.3em;
  display: flex;
  flex-grow: 1;
  align-items: center;
`
const Logo = () => (
  <LogoWrapper>
    <StyledReactLogo />
    <StyledRxJSLogo />
    <Link style={{paddingLeft: '3em'}} href="/">
      ReactRx
    </Link>
  </LogoWrapper>
)

export const Header = reactiveComponent(page$ =>
  page$.pipe(
    map(currentPage => (
      <StyledHeader>
        <HeaderInner>
          <Logo />
          {pages
            .filter(page => page.id !== 'home')
            .map(page => {
              return (
                <LinkWrapper isActive={page.id === currentPage.id}>
                  <PageLink key={page.id} href={page.route}>
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
    ))
  )
)

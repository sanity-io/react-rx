import {Link} from './Link'
import * as React from 'react'
import styled from 'styled-components'
import {reactiveComponent} from '../../src/reactiveComponent'
import {pages} from '../pages/pages'
import {map} from 'rxjs/operators'
import {RxJSLogo} from './logos/rxjs'
import {ReactLogo} from './logos/react'
import {GithubLogo} from './logos/Github'

const LogoWrapper = styled.div`
  font-family: Roboto, 'Helvetica Neue Light', 'Helvetica Neue', Helvetica, Arial, 'Lucida Grande',
    sans-serif;
  -webkit-font-smoothing: antialised;
  width: 10em;
  font-size: 2em;
  display: flex;
  flex-grow: 1;
`
const StyledHeader = styled.header`
  z-index: 2000;
  position: fixed;
  width: 100%;
  top: 0;
  left: 0;
  right: 0;
  background-color: #d9376e;
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
  padding: 1em 2em 1em 1em;
`

const LinkWrapper = styled.div`
  color: #efefef;
  padding: 0.5em 1.6em 0.5em 0;
`

const PageLink = styled(Link)`
  display: block;
  color: #eff0f3;
  &:link,
  &:visited {
    color: #eff0f3;
  }
`

const Logo = () => (
  <LogoWrapper>
    <div style={{position: 'relative', width: 70}}>
      <ReactLogo height="50" style={{position: 'absolute', left: 0}} />
      <RxJSLogo width="50" style={{opacity: 0.7, position: 'absolute', left: 0}} />
    </div>
    <div>
      <Link href="/">ReactRx</Link>
    </div>
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
    )),
  ),
)

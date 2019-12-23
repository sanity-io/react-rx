import {Link} from './Link'
import * as React from 'react'
import styled from 'styled-components'

const StyledHeader = styled.header`
  background-color: #4b213c;
  padding: 1em;
`

const LinkWrapper = styled.div`
  display: inline-block;
  background-color: ${props => (props.isActive ? '#5d2e4c' : '')};
  color: #efefef;
  padding: 0.5em;
`

const PageLink = styled(Link)`
  padding: 0.5em;
  color: #efefef;
  &:link {
    color: #efefef;
  }
  &:visited {
    color: #efefef;
  }
`

export const Header = ({pages, current}) => (
  <StyledHeader>
    {pages.map(page => {
      return (
        <LinkWrapper isActive={page.id === current.id}>
          <PageLink key={page.id} href={page.route}>
            {page.title}
          </PageLink>
        </LinkWrapper>
      )
    })}
  </StyledHeader>
)

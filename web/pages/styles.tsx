import styled from 'styled-components'
import * as React from 'react'
import Burger from 'react-css-burger'
import {media} from '../theme'

export const Container = styled.div`
  ${media.greaterThan('large')} {
    margin-left: 280px;
  }
`

const SidebarWrapper = styled.div`
  ${media.between('xsmall', 'small')} {
    font-size: 12px;
  }
  ${media.between('small', 'medium')} {
    font-size: 14px;
  }
  ${media.greaterThan('medium')} {
    font-size: 18px;
  }
  position: fixed;
  left: 0;
  padding: 0;
  z-index: 2000;
  top: 5em;
  ${media.greaterThan('large')} {
    button {
      display: none;
    }
  }
  ${media.lessThan('large')} {
    border-radius: 0 0.5em 0.5em 0;
    box-shadow: ${props => (props.isOpen ? '0 4px 10px 0 #444' : '0')};
    background-color: ${props => (props.isOpen ? '#eff0f3' : '#eff0f3')};
  }
`
const SidebarContent = styled.div`
  padding: 2em 0 0 1em;
  width: 250px;

  ${media.lessThan('large')} {
    display: ${props => (props.isOpen ? '' : 'none')};
  }
  ${media.greaterThan('large')} {
    width: 230px;
  }
  code {
    font-size: 0.9em;
  }
  ul {
    padding: 0 0 0 0.4em;

    overflow-y: auto;
    max-height: calc(62vh - 5em);

    li {
      padding: 0.3em 0;
      list-style: none;
      a,
      a:link,
      a:visited {
        color: #d9376e;
      }
      a.selected {
        border-bottom: 3px solid #ff8e3c;
      }
    }
  }
`

export const Sidebar = (props: {}) => {
  const [isOpen, setOpen] = React.useState(false)
  return (
    <SidebarWrapper isOpen={isOpen}>
      <Burger
        scale={0.6}
        active={isOpen}
        marginLeft={0}
        marginTop={0}
        onClick={() => setOpen(isOpen => !isOpen)}
      />
      <SidebarContent onClick={e => setOpen(false)} isOpen={isOpen}>
        {props.children}
      </SidebarContent>
    </SidebarWrapper>
  )
}

export const Content = styled.div`
  width: 100%;
`
export const ContentInner = styled.div`
  margin-top: 5em;
  padding: 1em;
`

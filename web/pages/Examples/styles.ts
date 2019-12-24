import styled from 'styled-components'

export const Container = styled.div`
  margin-left: 280px;
`
export const Sidebar = styled.div`
  position: fixed;
  top: 2.5em;
  left: 0;
  background-color: #fffffe;
  bottom: 0;
  padding: 2em;
  width: 200px;
  margin-top: 2em;
  ul {
    padding: 0;
    li {
      padding: 0.3em 0;
      list-style: none;
      a,
      a:link,
      a:visited {
        color: #d9376e;
      }
      a.selected {
        border-bottom: 5px solid #ff8e3c;
      }
    }
  }
`

export const Content = styled.div`
  width: 100%;
`
export const ContentInner = styled.div`
  margin-top: 5em;
  padding: 1em;
`

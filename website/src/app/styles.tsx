'use client'

import {styled} from 'styled-components'

export const Container = styled.div`
  display: flex;
  flex-direction: column;
`

export const ContentWrapper = styled.div`
  width: 100%;
  margin: 0;
`

export const ContentInner = styled.div`
  padding: 0 1em;
`
export const Content = (props: {children: React.ReactNode}) => {
  return (
    <ContentWrapper>
      <ContentInner>{props.children}</ContentInner>
    </ContentWrapper>
  )
}

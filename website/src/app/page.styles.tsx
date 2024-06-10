'use client'

import {styled} from 'styled-components'

import {COLORS} from '@/theme'

export const Content = styled.div`
  margin-top: 5em;
`
export const ContentInner = styled.div`
  padding: 1em 1em;
`
export const Cover = styled.div`
  background: ${COLORS.shadow};
  color: ${COLORS.background};
  padding-top: 2em;
  font-size: 2em;
  display: flex;
  flex-direction: row;
  justify-content: center;
  h1 {
    padding: 0 0 0 0.1em;
  }
`

export const Subsection = styled.div`
  display: flex;
  flex-direction: column;
`

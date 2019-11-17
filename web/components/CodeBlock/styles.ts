import styled from 'styled-components'

export const Pre = styled.pre`
  counter-reset: line;
`

export const Line = styled.span`
  &:before {
    position: absolute;
    right: 100%;
    margin-right: 10px;
    text-align: right;
    opacity: 0.3;
    user-select: none;
    counter-increment: line;
    content: counter(line);
  }
`

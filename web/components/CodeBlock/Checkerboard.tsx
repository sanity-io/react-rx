import styled from 'styled-components'
// const Gradient = styled.div`
//   background: linear-gradient(
//     20deg,
//     hsl(${props => props.hue}, 60%, 65%),
//     hsl(${props => props.hue - 305}, 64%, 60%)
//   );
//   height: 100%;
//   width: 100%;
// `

const CHECKER_SIZE = 60
const CHECKER_FG = '#252525'
const CHECKER_BG = '#222'

export const Checkerboard = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  width: 100%;
  background-color: ${CHECKER_FG};
  background-image: linear-gradient(45deg, ${CHECKER_BG} 25%, transparent 25%),
    linear-gradient(-45deg, ${CHECKER_BG} 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, ${CHECKER_BG} 75%),
    linear-gradient(-45deg, transparent 75%, ${CHECKER_BG} 75%);
  background-size: 20px 20px;
  background-position: 0 0, 0 10px, 10px -10px, -10px 0;

  background-size: ${CHECKER_SIZE}px ${CHECKER_SIZE}px;
  background-position: 0 0, 0 ${CHECKER_SIZE / 2}px, ${CHECKER_SIZE / 2}px -${CHECKER_SIZE / 2}px,
    -${CHECKER_SIZE / 2}px 0;
`

export const __Checkerboard = styled.div`
  background: linear-gradient(20deg, hsl(0, 60%, 65%), hsl(-305, 64%, 60%));
  height: 100%;
  width: 100%;
`

export const _Checkerboard = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 10rem;
  height: 100%;
  width: 100%;
  transition: background-color 0.1s linear;
  max-height: 18rem;
  overflow: hidden;
  flex-grow: 1;
  border-bottom: 1px;
  box-sizing: border-box;
  background-color: #fff;
  background-image: linear-gradient(45deg, #333, 25%, transparent 25%),
    linear-gradient(-45deg, #333, 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #333, 75%),
    linear-gradient(-45deg, transparent 75%, #333, 75%);
  background-size: 20px 20px;
  background-position: 0 0, 0 10px, 10px -10px, -10px 0;
`

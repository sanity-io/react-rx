import {CSSProperties} from 'react'

export function ReactRxLogo(props: {className?: string; style?: CSSProperties; size: string}) {
  return (
    <div
      className={props.className}
      style={{
        display: 'inline-block',
        verticalAlign: 'middle',
        position: 'relative',
        width: props.size,
        height: props.size,
        ...props.style,
      }}
    >
      <svg
        viewBox="0 0 288 288"
        xmlns="http://www.w3.org/2000/svg"
        style={{clipPath: 'circle(49%)'}}
      >
        <circle cx="144" cy="144" r="144" fill="white" />
        <g>
          <linearGradient
            id="a"
            gradientUnits="userSpaceOnUse"
            x1="53.496"
            x2="177.932"
            y1="247.701"
            y2="115.323"
          >
            <stop offset="0" stopColor="#e01d84"></stop>
            <stop offset=".401" stopColor="#df1d85"></stop>
            <stop offset=".77" stopColor="#932c87"></stop>
            <stop offset="1" stopColor="#5d2f88"></stop>
          </linearGradient>
          <radialGradient
            id="b"
            cx="190.456"
            cy="80.2"
            gradientTransform="matrix(1 .00239 -.002 .8362 .16 12.685)"
            gradientUnits="userSpaceOnUse"
            r="121.582"
          >
            <stop offset="0" stopColor="#e01d84"></stop>
            <stop offset=".139" stopColor="#de1e85"></stop>
            <stop offset=".285" stopColor="#d62085"></stop>
            <stop offset=".434" stopColor="#c92386"></stop>
            <stop offset=".586" stopColor="#b72786"></stop>
            <stop offset=".739" stopColor="#9d2b87"></stop>
            <stop offset=".891" stopColor="#7c2e88"></stop>
            <stop offset="1" stopColor="#5d2f88"></stop>
          </radialGradient>
          <linearGradient
            id="c"
            gradientUnits="userSpaceOnUse"
            x1="83.212"
            x2="137.371"
            y1="62.336"
            y2="62.336"
          >
            <stop offset="0" stopColor="#e01d84"></stop>
            <stop offset=".238" stopColor="#da1e85"></stop>
            <stop offset=".658" stopColor="#c72085"></stop>
            <stop offset=".999" stopColor="#b52284"></stop>
          </linearGradient>
          <path
            d="M29.6 175.3c-5.2-16.2-6.7-33.3-3.7-50.9 1.3-7.3 3.3-14.3 5.5-21.4 0 0 13.8-45.3 60.5-66 0 0 16.1-8.5 40.3-9.1 0 0-3.3-3.2-5.4-4.6-11.4-7.6-28.4-10.1-38.7.6-3.1 3.2-5.7 6.7-8.6 9.9-3.3 3.6-7.3 6.6-11.9 8.3-4 1.5-8 1.2-12.1 1.9-4.2.7-8.5 2.2-11.9 4.9-3.7 3-5.2 7-5.6 11.6-.4 3.6-.3 7.3-.5 10.9C37 82 33.6 85 26 90.9c-3.2 2.4-5.9 5.6-7.9 9-6 10.6 3.6 21.6 4.1 32.3.1 2.2-.1 4.4-.9 6.5-.8 2.3-2.4 3.8-3.7 5.7-1.8 2.5-3 5.5-2.5 8.6s2.1 6 3.6 8.7c2.9 4.8 6.5 9.1 10.3 13.2.2 0 .4.2.6.4"
            fill="#e32286"
          ></path>
          <path
            d="M220.4 213.7c23-10 32.8-27.3 32.8-27.3 21.5-29.3 14.2-60.2 14.2-60.2-13.7 29.8-26.2 38-26.2 38 33.7-51.3.2-82.3.2-82.3 13.7 29.2-4.5 64.8-4.5 64.8-15.3 32.2-37 43.7-37 43.7 24.2 4.5 42-11.8 42-11.8-34.7 37.5-72.3 35.7-72.3 35.7 15.8 17.7 39.5 16.2 39.5 16.2-31 7.3-60.1-3-84-22.9-4.5-3.7-8.8-7.7-12.8-12 0 0-3.6-3.8-4.3-4.8l-.1-.1c-.5 18.5 18.8 35.7 18.8 35.7-24.2-10-35.3-31.7-35.3-31.7s-16.3-27.8-4.5-59.5 47.5-38.5 47.5-38.5c29.5 14.3 54.5 18.8 54.5 18.8 52.7 8.8 49.7-17 49.7-17 .5-22.2-33-45.8-33-45.8C145.9 8.4 91.9 37 91.9 37c-46.7 20.7-60.5 66-60.5 66-2.2 7.1-4.2 14.1-5.5 21.4-5.1 29.7 2.6 57.8 19.3 82.8 26 38.8 68.2 52.2 68.2 52.2 62.5 21.2 105.2-10 105.2-10 39.3-27 47.2-58.2 47.2-58.2-31.7 24.8-45.4 22.5-45.4 22.5zM171.6 67.8c3 0 5.4 2.4 5.4 5.4s-2.4 5.4-5.4 5.4-5.4-2.4-5.4-5.4 2.4-5.4 5.4-5.4z"
            fill="url(#a)"
          ></path>
          <path
            d="M238.5 98.4c.5-22.2-33-45.8-33-45.8C145.8 8.4 91.8 37 91.8 37c-46.7 20.7-60.5 66-60.5 66-2.7 7.7-5.1 19.5-5.1 19.5-2.9 14.8-1.6 28.5-1.6 28.5 1.2 13.1 4.1 21.9 4.1 21.9 3 9.4 4.4 12.3 4.4 12.3-.1-.3-.6-2.5-.6-2.5s-4.2-20.2-.3-39.6c0 0 3.4-20.2 17.2-35.8 0 0 22.4-31.9 64.1-19.4 0 0 9 3.2 12.1 4.8 3.1 1.5 8.5 3.8 8.5 3.8 29.5 14.3 54.5 18.8 54.5 18.8 52.9 8.9 49.9-16.9 49.9-16.9zm-66.9-19.7c-3 0-5.4-2.4-5.4-5.4s2.4-5.4 5.4-5.4 5.4 2.4 5.4 5.4-2.4 5.4-5.4 5.4z"
            fill="url(#b)"
          ></path>
          <path
            d="M137.4 58.2l-34.1-10.6c-.2 0-1.2-.5-3 0 0 0-20.1 5.1-16.6 16.1 0 0 2.1 6.9 7.8 13.6l37.5-1.8z"
            fill="url(#c)"
          ></path>
        </g>
        <g>
          <g
            style={{mixBlendMode: 'color-dodge', transform: 'scale(2.1) translate(81.75px, 35px)'}}
          >
            <g
              stroke="#61dafb"
              strokeWidth="1"
              fill="none"
              style={{
                stroke: '#dbdbdb',
                mixBlendMode: 'darken',
                opacity: 0.5,
              }}
            >
              <ellipse rx="11" ry="4.2"></ellipse>
              <ellipse rx="11" ry="4.2" transform="rotate(60)"></ellipse>
              <ellipse rx="11" ry="4.2" transform="rotate(120)"></ellipse>
            </g>
            <g
              stroke="#61dafb"
              strokeWidth="1"
              fill="none"
              style={{
                mixBlendMode: 'color-burn',
                opacity: 0.5,
              }}
            >
              <ellipse rx="11" ry="4.2"></ellipse>
              <ellipse rx="11" ry="4.2" transform="rotate(60)"></ellipse>
              <ellipse rx="11" ry="4.2" transform="rotate(120)"></ellipse>
            </g>
            <g
              stroke="#61dafb"
              strokeWidth="1"
              fill="none"
              style={{
                mixBlendMode: 'color-burn',
                opacity: 0.5,
                scale: 1.5,
              }}
            >
              <ellipse rx="11" ry="4.2"></ellipse>
              <ellipse rx="11" ry="4.2" transform="rotate(60)"></ellipse>
              <ellipse rx="11" ry="4.2" transform="rotate(120)"></ellipse>
            </g>
          </g>
        </g>
      </svg>
    </div>
  )
}

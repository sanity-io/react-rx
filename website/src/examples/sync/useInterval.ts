import {useEffect, useRef} from 'react'

/**
 * A declarative setInterval. Pass `delay = null` to pause; the latest `callback`
 * always runs without resetting the timer.
 *
 * Original implementation, inspired by Dan Abramov's pattern:
 * https://overreacted.io/making-setinterval-declarative-with-react-hooks/
 */
export function useInterval(
  callback: () => void,
  delay: number | null,
) {
  const savedCallback = useRef(callback)

  useEffect(() => {
    savedCallback.current = callback
  }, [callback])

  useEffect(() => {
    if (delay === null) {
      return
    }
    const id = setInterval(
      () => savedCallback.current(),
      delay,
    )
    return () => clearInterval(id)
  }, [delay])
}

import {useEffect, useRef, useState} from 'react'

/**
 * The canonical correct implementation, from Dan Abramov's
 * "Making setInterval Declarative with React Hooks"
 * https://overreacted.io/making-setinterval-declarative-with-react-hooks/
 *
 * A naive `useEffect(() => setInterval(...))` either goes stale (empty deps:
 * the callback closes over old state) or resets the timer on every render
 * (deps on the callback). The fix needs a ref to smuggle the latest callback
 * past the effect's dependency check:
 */
function useInterval(
  callback: () => void,
  delay: number | null,
) {
  const savedCallback = useRef(callback)

  // Remember the latest callback.
  useEffect(() => {
    savedCallback.current = callback
  }, [callback])

  // Set up the interval.
  useEffect(() => {
    if (delay === null) return
    const id = setInterval(
      () => savedCallback.current(),
      delay,
    )
    return () => clearInterval(id)
  }, [delay])
}

export default function App() {
  const [count, setCount] = useState(0)
  const [delay, setDelay] = useState(1000)
  const [running, setRunning] = useState(true)

  useInterval(
    () => setCount((c) => c + 1),
    running ? delay : null,
  )

  return (
    <>
      <h4>{count}</h4>
      <label>
        Delay: {delay}ms
        <input
          type="range"
          min={100}
          max={2000}
          step={100}
          value={delay}
          onChange={(e) =>
            setDelay(
              Number(e.currentTarget.value),
            )
          }
        />
      </label>
      <label>
        <input
          type="checkbox"
          checked={running}
          onChange={(e) =>
            setRunning(e.currentTarget.checked)
          }
        />
        Running
      </label>
    </>
  )
}

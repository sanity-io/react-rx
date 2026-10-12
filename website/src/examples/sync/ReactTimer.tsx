import {useState} from 'react'

import {useInterval} from './useInterval'

// Plain React: useState holds every piece of state, useInterval drives the tick.
export function ReactTimer() {
  const [running, setRunning] = useState(false)
  const [delay, setDelay] = useState(1000)
  const [count, setCount] = useState(0)

  // A null delay pauses the interval without resetting count.
  useInterval(
    () => setCount((current) => current + 1),
    running ? delay : null,
  )

  return (
    <fieldset>
      <legend>React useInterval</legend>
      <p>Ticks: {count}</p>
      <p>
        <button
          type="button"
          onClick={() =>
            setRunning((value) => !value)
          }
        >
          {running ? 'Pause' : 'Start'}
        </button>
      </p>
      <p>
        <label>
          Interval: {delay}ms{' '}
          <input
            type="range"
            min={200}
            max={2000}
            step={200}
            value={delay}
            onChange={(event) =>
              setDelay(
                Number(event.currentTarget.value),
              )
            }
          />
        </label>
      </p>
    </fieldset>
  )
}

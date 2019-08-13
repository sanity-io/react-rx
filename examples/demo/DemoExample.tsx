import * as React from 'react'
import {useObservable, useObservableState} from '../../index'

export const DemoExample = () => {
  const [speed$, setSpeed] = useObservableState(100)

  return (
    <div>
      Hi
      <input
        type="range"
        min={1}
        max={1000}
        value={useObservable(speed$)}
        onChange={event => setSpeed(Number(event.currentTarget.value))}
      />
    </div>
  )
}

import * as React from 'react'

import {timer} from 'rxjs'
import {map, startWith, switchMap} from 'rxjs/operators'
import {reactiveComponent, useState} from '../../src/reactiveComponent'

export const HooksExample = reactiveComponent(function Hooks() {
  const [delay$, setDelay] = useState(100)

  return delay$.pipe(
    switchMap(delay =>
      timer(200, delay).pipe(
        startWith('Starting…'),
        map(n => `N: ${n}`),
        map(label => (
          <div>
            Current delay: {delay}
            <input
              type="range"
              min={0}
              max={1000}
              step={100}
              onClick={e => setDelay(Number(e.currentTarget.value) || 1000)}
            />
            {label}
          </div>
        ))
      )
    )
  )
})

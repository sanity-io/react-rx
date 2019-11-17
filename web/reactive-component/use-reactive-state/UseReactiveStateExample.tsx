import * as React from 'react'
import * as rxjs from 'rxjs'
import * as operators from 'rxjs/operators'
import {render} from '../../utils/eval-render-noop'
import {component, useState} from '@sanity/react-observable'
//@endimports

const {timer} = rxjs
const {map, startWith, switchMap} = operators

const UseReactiveStateExample = component(function Hooks() {
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

render(<UseReactiveStateExample />)

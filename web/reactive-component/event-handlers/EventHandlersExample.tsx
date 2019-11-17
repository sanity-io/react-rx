import * as React from 'react'
import * as operators from 'rxjs/operators'
import {component, useEvent} from '../../../src'
import {render} from '../../utils/eval-render-noop'
//@endimports

const {map, startWith} = operators

const STYLE = {
  height: 200,
  border: '1px solid',
  padding: '1em'
}

const EventHandlersExample = component(() => {
  const [mouseMoves$, onMouseMove] = useEvent<React.MouseEvent>()

  return mouseMoves$.pipe(
    map(event => ({x: event.clientX, y: event.clientY})),
    startWith(null),
    map(position => (
      <div>
        <div style={STYLE} onMouseMove={onMouseMove}>
          Move mouse here
        </div>
        {position && (
          <>
            Current position:
            <pre>{JSON.stringify(position, null, 2)}</pre>
          </>
        )}
      </div>
    ))
  )
})

render(<EventHandlersExample />)

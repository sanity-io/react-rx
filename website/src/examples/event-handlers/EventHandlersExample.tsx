import {MouseEvent, useMemo} from 'react'
import {useObservable} from 'react-rx'
import {Subject} from 'rxjs'
import {map, startWith, tap} from 'rxjs/operators'

// Create subject for mouse moves
const mouseMove$ = new Subject<MouseEvent>()

function EventHandlersExample() {
  // Create mouse position stream
  const position$ = useMemo(
    () =>
      mouseMove$.pipe(
        map((event) => ({
          x: event.clientX,
          y: event.clientY,
        })),
        startWith(null),
      ),
    [],
  )

  const position = useObservable(position$, null)

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        textAlign: 'center',
        height: 150,
        width: 150,
        border: '1px dashed',
        padding: '1em',
      }}
      onMouseMove={(event) =>
        mouseMove$.next(event)
      }
    >
      <div
        style={{
          width: '100%',
        }}
      >
        {position ? (
          <>
            Cursor position: X:
            {position.x}, Y: {position.y}
          </>
        ) : (
          <>Move mouse here</>
        )}
      </div>
    </div>
  )
}

export default EventHandlersExample

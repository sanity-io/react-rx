import {
  component,
  map,
  RxJS,
  React,
  ReactDOM,
  startWith,
  takeUntil,
  useEvent,
  endWith,
  combineLatest,
  switchMap,
  of,
  tap,
  merge
} from '../_utils/globalScope'
import {NEVER} from 'rxjs'

//@endimport

const STYLE: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  textAlign: 'center',
  height: 150,
  width: 150,
  border: '1px dashed',
  padding: '1em'
}

const EventHandlersExample = component(() => {
  const [mouseMoves$, onMouseMove] = useEvent<React.MouseEvent>()

  const mousePosition$ = mouseMoves$.pipe(
    map(event => ({x: event.clientX, y: event.clientY})),
    startWith(null)
  )
  return mousePosition$.pipe(
    map(position => (
      <div style={STYLE} onMouseMove={onMouseMove}>
        <div style={{width: '100%'}}>
          {position ? (
            <>
              Cursor position: X:{position.x}, Y: {position.y}
            </>
          ) : (
            <>Move mouse here</>
          )}
        </div>
      </div>
    ))
  )
})

ReactDOM.render(
  <EventHandlersExample />,
  document.getElementById('event-handlers')
)

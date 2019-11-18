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

const STYLE = {
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
      <div>
        <div style={STYLE} onMouseMove={onMouseMove}>
          Move mouse here
        </div>
        <div style={{padding: 4, height: '2em', textAlign: 'center'}}>
          {position && (
            <>
              Cursor position:
              <br /> X:{position.x}, Y: {position.y}
            </>
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

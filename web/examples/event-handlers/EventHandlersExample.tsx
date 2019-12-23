import {
  reactiveComponent,
  map,
  React,
  ReactDOM,
  startWith,
  useEvent
} from '../_utils/globalScope'
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

const EventHandlersExample = reactiveComponent(() => {
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
  document.getElementById('event-handlers-example')
)

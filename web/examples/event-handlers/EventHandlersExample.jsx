import {
  component,
  map,
  React,
  ReactDOM,
  startWith,
  useEvent
} from '../_utils/globalScope'
//@endimport

const STYLE = {
  height: 200,
  border: '1px solid',
  padding: '1em'
}

const EventHandlersExample = component(() => {
  const [mouseMoves$, onMouseMove] = useEvent()

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

ReactDOM.render(
  <EventHandlersExample />,
  document.getElementById('event-handlers')
)

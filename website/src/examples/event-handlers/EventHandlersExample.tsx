import * as React from 'react'
import * as ReactDOM from 'react-dom'
import * as RxJS from 'rxjs'
import * as operators from 'rxjs/operators'

const {of, from, concat, merge} = RxJS
const {
  timer,
  interval,
  throwError,
  combineLatest,
  Observable,
} = RxJS

const {map, filter, reduce, scan, tap} = operators
const {concatMap, mergeMap, switchMap, mapTo} =
  operators
const {startWith, catchError, take} = operators
//@endimport

import {observableCallback} from 'observable-callback'
import {
  context,
  elementRef,
  forwardRef,
  handler,
  rxComponent,
  state,
  useAsObservable,
  useMemoObservable,
  useObservable,
} from 'react-rx-old'

const STYLE: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  textAlign: 'center',
  height: 150,
  width: 150,
  border: '1px dashed',
  padding: '1em',
}

const EventHandlersExample = rxComponent(() => {
  const [mouseMoves$, onMouseMove] =
    handler<React.MouseEvent>()

  const mousePosition$ = mouseMoves$.pipe(
    map((event) => ({
      x: event.clientX,
      y: event.clientY,
    })),
    startWith(null),
  )
  return mousePosition$.pipe(
    map((position) => (
      <div
        style={STYLE}
        onMouseMove={onMouseMove}
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
    )),
  )
})

ReactDOM.render(
  <EventHandlersExample />,
  document.getElementById(
    'event-handlers-example',
  ),
)

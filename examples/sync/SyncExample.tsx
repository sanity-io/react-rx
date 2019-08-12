import * as React from 'react'
import {concat, of, timer} from 'rxjs'
import {map, take, tap} from 'rxjs/operators'
import {stream, streamingComponent, useObservable} from '../../hooks'

// this will synchronously set the state before the component mounts, and thereafter
// wait 1 second before starting updating every 500ms

const UPDATE_COUNT = 10

const Sync1 = streamingComponent(() =>
  concat(
    of('First render is sync! (waiting…)'),
    timer(1000, 500).pipe(
      map(n => `Update #${n + 1} of ${UPDATE_COUNT}`),
      take(UPDATE_COUNT)
    ),
    of('Completed!')
  )
)
interface Props {
  text: string
}
const Sync2 = (props: Props) => {
  return (
    <div>Sync 2: {useObservable(stream(props.text).pipe(map(text => text.toUpperCase())))}</div>
  )
}

export const SyncExample = () => {
  return (
    <div>
      <Sync1 />
      {useObservable(timer(0, 100).pipe(map(n => <Sync2 text={`This is a text ${n}`} />)))}
    </div>
  )
}

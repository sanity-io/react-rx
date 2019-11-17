import * as React from 'react'
import {concat, of, timer} from 'rxjs'
import {map, take} from 'rxjs/operators'
import {reactiveComponent, toObservable, useObservable} from '../../src'

const UPDATE_COUNT = 10

const Sync1 = reactiveComponent(() =>
  concat(
    of("This is the first render render and it's sync! (waiting…)"),
    timer(1000, 500).pipe(
      map(n => `Update #${n + 1} of ${UPDATE_COUNT}`),
      take(UPDATE_COUNT),
    ),
    of('Completed!'),
  ),
)

interface Props {
  text: string
}

const UseObservableSync = (props: Props) => {
  return (
    <div>
      {useObservable(toObservable(props.text).pipe(map(text => text.toUpperCase())))}
      <div>(initial render is sync)</div>
    </div>
  )
}

export const SyncExample = () => {
  return (
    <div style={{border: '1px solid', padding: '1em'}}>
      <Sync1 />
      <hr />
      {useObservable(
        timer(0, 1000).pipe(
          map(n => <UseObservableSync text={`This is a text ${n}`} />),
          take(5),
        ),
      )}
    </div>
  )
}

import * as React from 'react'
import {timer} from 'rxjs'
import {map} from 'rxjs/operators'
import {withPropsStream} from '../../src/withPropsStream'

const numbers$ = timer(0, 1000).pipe(map(n => ({number: n})))

export const SimpleExample = withPropsStream(
  () => numbers$,
  props => <div>The number is {props.number}</div>
)

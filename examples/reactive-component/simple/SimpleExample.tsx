import * as React from 'react'
import {timer} from 'rxjs'
import {filter, map} from 'rxjs/operators'
import {reactiveComponent} from '../../../src/reactiveComponent'

// This will only show even numbers
export const SimpleExample = reactiveComponent(
  timer(0, 200).pipe(
    filter(n => n % 2 === 0),
    map(n => <div>This is an even number: {n}</div>),
  ),
)

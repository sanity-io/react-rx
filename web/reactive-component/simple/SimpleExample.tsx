import * as React from 'react'
import * as rxjs from 'rxjs'
import * as operators from 'rxjs/operators'
import {component} from '../../../src'
import {render} from '../../utils/eval-render-noop'
//@endimports

const {timer} = rxjs
const {map, filter} = operators

// This will only show even numbers
const SimpleExample = component(
  timer(0, 200).pipe(
    filter(n => n % 2 === 0),
    map(n => <div>This is an even number: {n}</div>)
  )
)

render(<SimpleExample />)

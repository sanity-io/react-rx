import * as React from 'react'
import * as rxjs from 'rxjs'
import * as operators from 'rxjs/operators'
import {reactiveComponent} from '../../../src'
import {render} from '../../utils/eval-render-noop'
//@endimports
const {timer} = rxjs
const {map, scan, take} = operators

const FizzBuzzExample = reactiveComponent(
  timer(0, 200).pipe(
    map(n => n + 1),
    map(n => {
      const divBy3 = n % 3 === 0
      const divBy5 = n % 5 === 0
      const divBy3And5 = divBy3 && divBy5
      return divBy3And5 ? 'Fizz Buzz' : divBy3 ? 'Fizz' : divBy5 ? 'Buzz' : String(n)
    }),
    scan((seq: string[], curr) => seq.concat(curr), []),
    map(seq =>
      seq.map((n, i) => (
        <li key={n + i}>
          {i + 1}: {n}
        </li>
      ))
    ),
    take(100)
  )
)

render(<FizzBuzzExample />)

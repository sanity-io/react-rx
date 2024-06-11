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

const {map, filter, reduce, scan, tap} =
  operators
const {
  concatMap,
  mergeMap,
  switchMap,
  mapTo,
} = operators
const {startWith, catchError, take} =
  operators
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

const FizzBuzzExample = rxComponent(
  timer(0, 500).pipe(
    map((n) => n + 1),
    map((n) => {
      const divBy3 = n % 3 === 0
      const divBy5 = n % 5 === 0
      const divBy3And5 =
        divBy3 && divBy5
      return divBy3And5
        ? 'Fizz Buzz'
        : divBy3
          ? 'Fizz'
          : divBy5
            ? 'Buzz'
            : String(n)
    }),
    // map((seq: string[], curr) => seq.concat(curr), []),
    map((n, i) => (
      <div key={n + i}>
        {i + 1}: {n}
      </div>
    )),
    take(100),
  ),
)

export default FizzBuzzExample

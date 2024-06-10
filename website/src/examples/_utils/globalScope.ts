import * as React from 'react'
import * as ReactDOM from 'react-dom'
import * as RxJS from 'rxjs'
import * as operators from 'rxjs/operators'

const {of, from, concat, merge} = RxJS
const {timer, interval, throwError, combineLatest, Observable} = RxJS

const {map, filter, reduce, scan, tap} = operators
const {concatMap, mergeMap, switchMap, mapTo} = operators
const {startWith, catchError, take} = operators
//@endimport

export {combineLatest, concat, from, interval, merge, Observable, of, throwError, timer}
export {
  catchError,
  concatMap,
  filter,
  map,
  mapTo,
  mergeMap,
  reduce,
  scan,
  startWith,
  switchMap,
  take,
  tap,
}

export {React, ReactDOM}
export {operators, RxJS}

export {observableCallback} from 'observable-callback'
export {
  context,
  elementRef,
  forwardRef,
  handler,
  rxComponent,
  state,
  useAsObservable,
  useMemoObservable,
  useObservable,
} from 'react-rx'

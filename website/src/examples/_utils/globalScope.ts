import * as React from 'react'
import * as ReactDOM from 'react-dom'
import * as RxJS from 'rxjs'
import * as operators from 'rxjs/operators'

const {of, from, concat, merge} = RxJS
const {timer, interval, throwError, combineLatest} = RxJS

const {map, filter, reduce, scan, tap} = operators
const {concatMap, mergeMap, switchMap, mapTo} = operators
const {startWith, catchError, take} = operators
//@endimport

export {of, from, timer, interval, concat, merge, throwError, combineLatest}
export {
  map,
  filter,
  reduce,
  scan,
  concatMap,
  tap,
  mapTo,
  mergeMap,
  startWith,
  take,
  switchMap,
  catchError
}

export {React, ReactDOM}
export {RxJS, operators}

export {
  rxComponent,
  observeContext,
  observeCallback,
  observeState,
  observeElement,
  forwardRef,
  useAsObservable
} from 'react-rx'

export {observableCallback} from 'observable-callback'

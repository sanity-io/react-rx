import * as React from 'react'
import * as ReactDOM from 'react-dom'
import {
  of,
  from,
  timer,
  interval,
  concat,
  merge,
  throwError,
  combineLatest
} from 'rxjs'
import * as RxJS from 'rxjs'
import {
  map,
  filter,
  reduce,
  scan,
  concatMap,
  tap,
  flatMap,
  mergeMap,
  startWith,
  withLatestFrom,
  distinctUntilChanged,
  switchMap,
  mapTo,
  mergeMapTo,
  catchError,
  switchMapTo,
  sampleTime,
  take,
  share,
  takeUntil,
  endWith
} from 'rxjs/operators'
import * as operators from 'rxjs/operators'
//@endimport

import {
  reactiveComponent,
  useEvent,
  useContext,
  useState,
  forwardRef
} from '../../../src'

export {createEventHandler} from '../../../src/common'
export {of, from, timer, interval, concat, merge, throwError, combineLatest}
export {
  map,
  filter,
  reduce,
  scan,
  concatMap,
  tap,
  mapTo,
  flatMap,
  mergeMap,
  withLatestFrom,
  startWith,
  take,
  switchMap,
  distinctUntilChanged,
  mergeMapTo,
  catchError,
  switchMapTo,
  sampleTime,
  share,
  endWith,
  takeUntil
}

export {React, ReactDOM}
export {RxJS, operators}

export {reactiveComponent, useEvent, useContext, useState, forwardRef}

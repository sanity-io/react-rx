import * as React from 'react'
import {Observable} from 'rxjs'
import {map} from 'rxjs/operators'
import {withPropsStream} from './withPropsStream'

interface ElementProps {
  element: React.ReactElement<any>
}

export function streamingComponent<T>(
  setup: (inputProps$: Observable<T>) => Observable<React.ReactElement<any>>
) {
  return withPropsStream<T, ElementProps>(
    props$ => setup(props$).pipe(map(element => ({element}))),
    props => props.element
  )
}

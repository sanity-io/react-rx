import * as React from 'react'
import {Observable} from 'rxjs'
import {map} from 'rxjs/operators'
import {streamingComponent} from './streamingComponent'

type SetupFunction<SourceProps, TargetProps> =
  | Observable<TargetProps>
  | ((props$: Observable<SourceProps>) => Observable<TargetProps>)

export function withPropsStream<SourceProps, TargetProps>(
  setup: SetupFunction<SourceProps, TargetProps>,
  TargetComponent: React.ComponentType<TargetProps>
) {
  return streamingComponent<SourceProps>(sourceProps$ => {
    const targetProps$ = typeof setup === 'function' ? setup(sourceProps$) : setup
    return targetProps$.pipe(map(props => <TargetComponent {...props} />))
  })
}

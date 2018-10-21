import * as React from 'react'
import wrapDisplayName from 'recompose/wrapDisplayName'
import {Observable, Subject, Subscription} from 'rxjs'

export type SetupFunction<SourceProps, TargetProps> =
  | Observable<TargetProps>
  | ((props$: Observable<SourceProps>) => Observable<TargetProps>)

export function withPropsStream<SourceProps, TargetProps>(
  setup: SetupFunction<SourceProps, TargetProps>,
  TargetComponent: React.ComponentType<TargetProps>
): React.ComponentType<SourceProps> {
  return class WithPropsStream extends React.Component<SourceProps, {targetProps: TargetProps}> {
    static displayName = wrapDisplayName(TargetComponent, 'withPropsStream')

    subscription: Subscription
    props$: Subject<SourceProps> = new Subject()

    constructor(props) {
      super(props)

      let isSync = true

      const childProps$ = typeof setup === 'function' ? setup(this.props$.asObservable()) : setup

      this.subscription = childProps$.subscribe(childProps => {
        this.setChildProps(childProps, isSync)
      })

      this.props$.next(this.props)
      isSync = false
    }

    setChildProps = (childProps: TargetProps, isSync: boolean) => {
      if (typeof childProps !== 'object' || childProps === null) {
        throw new Error(
          'The observable emitted a non-object value. It should be an object that can be passed as react props.'
        )
      }

      const state = {targetProps: childProps}
      if (isSync) {
        this.state = state
      } else {
        this.setState(state)
      }
    }

    componentWillUnmount() {
      this.subscription.unsubscribe()
    }

    // todo: figure out a future proof way of handling this
    UNSAFE_componentWillReceiveProps(nextProps: SourceProps) {
      this.props$.next(nextProps)
    }

    render() {
      return this.state ? React.createElement(TargetComponent, this.state.targetProps) : null
    }
  }
}

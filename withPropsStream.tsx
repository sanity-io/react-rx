import * as React from 'react'
import wrapDisplayName from 'recompose/wrapDisplayName'
import {from as observableFrom, Observable, Subject} from 'rxjs'

export function withPropsStream<OwnerProps, ChildProps>(
  getObservable: (inputProps$: Observable<OwnerProps>) => Observable<ChildProps>,
  BaseComponent: React.ComponentType<OwnerProps>
): React.ComponentType<OwnerProps> {
  return class WithPropsStream extends React.Component<OwnerProps, ChildProps> {
    public static displayName = wrapDisplayName(BaseComponent, 'withPropsStream')

    public subscription: any

    public state: ChildProps = null
    public props$: Subject<OwnerProps> = new Subject()

    constructor(props) {
      super(props)
      let sync = true
      this.subscription = getObservable(observableFrom(this.props$)).subscribe(childProps => {
        this.setChildProps(childProps, sync)
      })
      this.props$.next(this.props)
      sync = false
    }

    public setChildProps = (childProps: ChildProps, sync: boolean) => {
      if (typeof childProps !== 'object' || childProps === null) {
        throw new Error(
          'The observable emitted a non-object value. It should be an object that can be passed as react props.'
        )
      }
      if (sync) {
        this.state = childProps
      } else {
        this.setState(childProps)
      }
    }

    public componentWillUnmount() {
      this.subscription.unsubscribe()
    }

    // todo: figure out a future proof way of handling this
    public UNSAFE_componentWillReceiveProps(nextProps: OwnerProps) {
      this.props$.next(nextProps)
    }

    public render() {
      return this.state ? <BaseComponent {...this.state} /> : null
    }
  }
}

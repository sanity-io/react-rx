import * as React from 'react'
import wrapDisplayName from 'recompose/wrapDisplayName'
import {Observable, Subject, Subscription} from 'rxjs'

export function withPropsStream<OwnerProps, ChildProps>(
  setup: (inputProps$: Observable<OwnerProps>) => Observable<ChildProps>,
  BaseComponent: React.ComponentType<ChildProps>
): React.ComponentType<OwnerProps> {
  return class WithPropsStream extends React.Component<OwnerProps, ChildProps> {
    static displayName = wrapDisplayName(BaseComponent, 'withPropsStream')

    subscription: Subscription

    state: ChildProps = null
    props$: Subject<OwnerProps> = new Subject()

    constructor(props) {
      super(props)

      let isSync = true

      const childProps$ = setup(this.props$.asObservable())

      this.subscription = childProps$.subscribe(childProps => {
        this.setChildProps(childProps, isSync)
      })

      this.props$.next(this.props)
      isSync = false
    }

    setChildProps = (childProps: ChildProps, isSync: boolean) => {
      if (typeof childProps !== 'object' || childProps === null) {
        throw new Error(
          'The observable emitted a non-object value. It should be an object that can be passed as react props.'
        )
      }
      if (isSync) {
        this.state = childProps
      } else {
        this.setState(childProps)
      }
    }

    componentWillUnmount() {
      this.subscription.unsubscribe()
    }

    // todo: figure out a future proof way of handling this
    UNSAFE_componentWillReceiveProps(nextProps: OwnerProps) {
      this.props$.next(nextProps)
    }

    render() {
      return this.state ? <BaseComponent {...this.state} /> : null
    }
  }
}

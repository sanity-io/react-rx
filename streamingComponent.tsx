import * as React from 'react'
import {Observable, Subject, Subscription} from 'rxjs'

type SetupFunction<SourceProps> =
  | Observable<React.ReactNode>
  | ((props$: Observable<SourceProps>) => Observable<React.ReactNode>)

interface State {
  node: React.ReactNode | null
}

export function streamingComponent<SourceProps>(
  setup: SetupFunction<SourceProps>
): React.ComponentType<SourceProps> {
  return class WithPropsStream extends React.Component<SourceProps, State> {
    subscription: Subscription
    props$: Subject<SourceProps> = new Subject()

    constructor(props) {
      super(props)

      let isSync = true

      const node$ = typeof setup === 'function' ? setup(this.props$.asObservable()) : setup

      this.state = {node: null}

      this.subscription = node$.subscribe(node => {
        this.setStateMaybeSync({node}, isSync)
      })

      this.props$.next(this.props)

      isSync = false
    }

    setStateMaybeSync = (nextState, isSync: boolean) => {
      if (isSync) {
        this.state = nextState
      } else {
        this.setState(nextState)
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
      return this.state.node
    }
  }
}

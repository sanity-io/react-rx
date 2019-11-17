import * as React from 'react'
import {Observable} from 'rxjs'
import {wrapDisplayName} from './common'
import {toObservable, useObservable} from './useObservable'

type Component<Props> = (input$: Observable<Props>) => Observable<React.ReactNode>

function fromComponent<Props>(component: Component<Props>): React.FunctionComponent<Props> {
  const wrappedComponent = (props: Props) =>
    React.createElement(
      React.Fragment,
      null,
      useObservable<React.ReactNode>(component(toObservable(props))),
    )
  wrappedComponent.displayName = wrapDisplayName(component, 'reactiveComponent')
  return wrappedComponent
}

function fromObservable<Props>(input$: Observable<Props>): React.FunctionComponent<{}> {
  return function ReactiveComponent() {
    return React.createElement(React.Fragment, null, useObservable<React.ReactNode>(input$))
  }
}

export function reactiveComponent<Props>(observable: Observable<Props>): React.FunctionComponent<{}>
export function reactiveComponent<Props>(
  component: Component<Props>,
): React.FunctionComponent<Props>
export function reactiveComponent<Props>(
  observableOrComponent: Observable<Props> | Component<Props>,
) {
  return typeof observableOrComponent === 'function'
    ? fromComponent(observableOrComponent)
    : fromObservable(observableOrComponent)
}

type ForwardRefComponent<RefType, Props> = (
  input$: Observable<Props>,
  ref: React.Ref<RefType>,
) => Observable<React.ReactNode>

export function forwardRef<RefType, Props = {}>(component: ForwardRefComponent<RefType, Props>) {
  const wrappedComponent = React.forwardRef((props: Props, ref: React.Ref<RefType>) => {
    return React.createElement(
      React.Fragment,
      null,
      useObservable(component(toObservable(props), ref)),
    )
  })
  wrappedComponent.displayName = wrapDisplayName(component, 'reactiveComponent')
  return wrappedComponent
}

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
      useObservable<React.ReactNode>(component(toObservable(props)))
    )
  wrappedComponent.displayName = wrapDisplayName(component, 'reactiveComponent')
  return wrappedComponent
}

function fromObservable<Props>(input$: Observable<Props>): React.FunctionComponent<{}> {
  return function ReactiveComponent() {
    return React.createElement(React.Fragment, null, useObservable<React.ReactNode>(input$))
  }
}

export {
  useObservableState as useState,
  useObservableContext as useContext,
  useObservableEvent as useEvent,
  toObservable
} from './useObservable'

export function reactiveComponent<Props>(observable: Observable<Props>): React.FunctionComponent<{}>
export function reactiveComponent<Props>(
  component: Component<Props>
): React.FunctionComponent<Props>
export function reactiveComponent<Props>(
  observableOrComponent: Observable<Props> | Component<Props>
) {
  return typeof observableOrComponent === 'function'
    ? fromComponent(observableOrComponent)
    : fromObservable(observableOrComponent)
}

type ForwardRefComponent<Props, Ref> = (
  input$: Observable<Props>,
  ref: React.RefObject<Ref>
) => Observable<React.ReactNode>

export function forwardRef<Props, RefType>(component: ForwardRefComponent<Props, RefType>) {
  const wrappedComponent = React.forwardRef((props: Props, ref: React.RefObject<RefType>) =>
    React.createElement(
      React.Fragment,
      null,
      useObservable<React.ReactNode>(component(toObservable(props), ref))
    )
  )
  wrappedComponent.displayName = wrapDisplayName(component, 'reactiveComponent')
  return wrappedComponent
}

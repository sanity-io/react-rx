/* eslint-disable react-hooks/rules-of-hooks */
import {Observable} from 'rxjs'
import {wrapDisplayName} from './displayName'
import {useAsObservable} from './useAsObservable'
import {useObservable} from './useObservable'
import {
  createElement,
  Fragment,
  FunctionComponent,
  ReactNode,
  Ref,
  useRef,
  forwardRef as reactForwardRef,
} from 'react'

type Component<Props> = (input$: Observable<Props>) => Observable<ReactNode>

function fromComponent<Props>(component: Component<Props>): FunctionComponent<Props> {
  const wrappedComponent = (props: Props) => {
    return createElement(
      Fragment,
      null,
      useObservable<ReactNode>(useRef(component(useAsObservable(props))).current),
    )
  }
  wrappedComponent.displayName = wrapDisplayName(component, 'reactiveComponent')
  return wrappedComponent
}

// eslint-disable-next-line @typescript-eslint/ban-types
function fromObservable<Props>(input$: Observable<ReactNode>): FunctionComponent<{}> {
  return function ReactiveComponent() {
    return createElement(Fragment, null, useObservable<ReactNode>(input$))
  }
}

export function reactiveComponent<Props>(observable: Observable<Props>): FunctionComponent<Props>
export function reactiveComponent<Props>(component: Component<Props>): FunctionComponent<Props>
export function reactiveComponent<Props>(
  observableOrComponent: Observable<ReactNode> | Component<Props>,
) {
  return typeof observableOrComponent === 'function'
    ? fromComponent(observableOrComponent)
    : fromObservable(observableOrComponent)
}

type ForwardRefComponent<RefType, Props> = (
  input$: Observable<Props>,
  ref: Ref<RefType>,
) => Observable<ReactNode>

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/ban-types
export function forwardRef<RefType, Props = {}>(component: ForwardRefComponent<RefType, Props>) {
  const wrappedComponent = reactForwardRef((props: Props, ref: Ref<RefType>) => {
    return createElement(
      Fragment,
      null,
      useObservable<ReactNode>(useRef(component(useAsObservable(props), ref)).current),
    )
  })
  wrappedComponent.displayName = wrapDisplayName(component, 'reactiveComponent')
  return wrappedComponent
}

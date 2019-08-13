import * as React from 'react'
import {BehaviorSubject, Observable, Subject, Subscription} from 'rxjs'
import {wrapDisplayName} from './displayName'

export function useObservable<T>(observable$: Observable<T>): T | null
export function useObservable<T>(observable$: Observable<T>, initialValue: T): T
export function useObservable<T>(observable$: Observable<T>, initialValue?: T): T | null {
  const subscription = React.useRef<Subscription>()

  const [value, setState] = React.useState<T | null>(() => {
    let isSync = true
    let syncVal = typeof initialValue === 'undefined' ? null : initialValue
    subscription.current = observable$.subscribe(nextVal => {
      if (isSync) {
        syncVal = nextVal
      } else {
        setState(nextVal)
      }
    })
    isSync = false
    return syncVal
  })

  React.useEffect(
    () => () => {
      if (subscription.current) {
        subscription.current.unsubscribe()
      }
    },
    []
  )

  return value
}

export function useObservableState<T>(initial: T): [Observable<T>, (next: T) => void] {
  const [value, set] = React.useState<T>(initial)
  return [stream(value), set]
}

type EventHandlerPair<Event> = [Observable<Event>, (event: Event) => void]

// for consumption outside of react only
export function createEventHandler<Event>(): EventHandlerPair<Event> {
  const events$: Subject<Event> = new Subject()
  const handler = (event: Event) => events$.next(event)
  return [events$.asObservable(), handler]
}

export function useEventHandler<Event>(): EventHandlerPair<Event> {
  return React.useMemo<EventHandlerPair<Event>>(createEventHandler, [])
}

export function stream<T>(value: T): Observable<T> {
  const subject$ = React.useMemo<Subject<T>>(() => new BehaviorSubject(value), [])

  React.useEffect(() => subject$.next(value), [value])

  return subject$.asObservable()
}

type Component<Props> = (input$: Observable<Props>) => Observable<React.ReactNode>

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

function fromComponent<Props>(component: Component<Props>): React.FunctionComponent<Props> {
  const wrappedComponent = (props: Props) =>
    React.createElement(
      React.Fragment,
      null,
      useObservable<React.ReactNode>(component(stream(props)))
    )
  wrappedComponent.displayName = wrapDisplayName(component, 'reactiveComponent')
  return wrappedComponent
}

function fromObservable<Props>(input$: Observable<Props>): React.FunctionComponent<{}> {
  return function ComponentFromStream() {
    return React.createElement(React.Fragment, null, useObservable<React.ReactNode>(input$))
  }
}

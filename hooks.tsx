import * as React from 'react'
import {BehaviorSubject, Observable, Subject, Subscription} from 'rxjs'

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

export function stream<T>(value: T): Observable<T> {
  const subject$ = React.useMemo<Subject<T>>(() => new BehaviorSubject(value), [])

  React.useEffect(() => subject$.next(value), [value])

  return subject$.asObservable()
}

export function streamingComponent<Props>(
  component: (input$: Observable<Props>) => Observable<React.ReactNode>
) {
  const wrapped = (props: Props) => <>{useObservable<React.ReactNode>(component(stream(props)))}</>
  wrapped.displayName = getDisplayName(component)
  return wrapped
}

export function useEventHandler<Event>(): [Observable<Event>, (event: Event) => void] {
  const events$: Subject<Event> = new Subject()
  return [events$.asObservable(), (event: Event) => events$.next(event)]
}

function getDisplayName(wrapped: any) {
  return wrapped.displayName || wrapped.name || 'Unknown'
}

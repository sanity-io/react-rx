import {concat, Observable, of, Subject} from 'rxjs'

// for consumption outside of react only
export function createEventHandler<T>(): [Observable<T>, (nextValue: T) => void] {
  const events$: Subject<T> = new Subject()
  const handler = (event: T) => events$.next(event)
  return [events$.asObservable(), handler]
}

// for consumption outside of react only
export function createState<T>(initialState: T): [Observable<T>, (nextValue: T) => void] {
  const [value$, handler] = createEventHandler<T>()
  return [concat<T>(of(initialState), value$), handler]
}

const getDisplayName = Component => {
  if (typeof Component === 'string') {
    return Component
  }

  return Component.displayName || Component.name || 'Unknown'
}

export const wrapDisplayName = (BaseComponent, wrapperName) =>
  `${wrapperName}(${getDisplayName(BaseComponent)})`

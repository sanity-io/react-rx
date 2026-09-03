import {useState} from 'react'
import {type Observable, Subject} from 'rxjs'

/**
 * Creates an observable event stream and a stable handler that pushes events into it.
 *
 * The underlying `Subject` is scoped to the component instance and created once. Only its
 * observable side is exposed, so values can only be pushed through the handler.
 *
 * @public
 */
export function useObservableSubject<T>(): [
  events$: Observable<T>,
  handleEvent: (event: T) => void,
] {
  const [observableSubject] = useState<[events$: Observable<T>, handleEvent: (event: T) => void]>(
    () => {
      const subject = new Subject<T>()
      return [subject.asObservable(), (event: T) => subject.next(event)]
    },
  )

  return observableSubject
}

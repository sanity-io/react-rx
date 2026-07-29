import {type Observable, Subject} from 'rxjs'

/**
 * Vendored from https://github.com/bjoerge/observable-callback
 * (only the overload we need).
 */
export function observableCallback<T>(): [Observable<T>, (arg: T) => void] {
  const subject = new Subject<T>()
  return [subject.asObservable(), (arg: T) => subject.next(arg)]
}

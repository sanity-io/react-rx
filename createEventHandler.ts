import {Subject} from 'rxjs'

export function createEventHandler<Event>() {
  const events$: Subject<Event> = new Subject()
  return {
    handler: (event: Event) => events$.next(event),
    events$: events$.asObservable()
  }
}

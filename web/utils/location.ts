import {createBrowserHistory} from 'history'
import {Observable} from 'rxjs'
import {publishReplay, refCount} from 'rxjs/operators'

const history = createBrowserHistory()

export const location$ = new Observable<typeof history.location>(subscriber => {
  subscriber.next(history.location)
  return history.listen(location => subscriber.next(location))
}).pipe(publishReplay(1), refCount())

export const navigate = (url: string) => {
  history.push(url)
}

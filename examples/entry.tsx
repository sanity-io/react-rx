import * as React from 'react'
import * as ReactDOM from 'react-dom'
import {Observable} from 'rxjs'
import {map, tap} from 'rxjs/operators'
import {Examples} from './Examples'

const hash$: Observable<string> = new Observable(subscriber => {
  const emitHash = () => subscriber.next(window.location.hash)
  emitHash()
  window.addEventListener('hashchange', emitHash, false)
  return () => {
    window.removeEventListener('hashchange', emitHash, false)
  }
})

const App$ = hash$.pipe(
  map(hash => hash.substring(1)),
  map((hash: string) => <Examples selectedExampleName={hash} />)
)

const render = (container: HTMLElement) => (input$: Observable<React.ReactElement>) =>
  new Observable(subscriber => {
    const subscription = input$
      .pipe(tap(vdom => ReactDOM.render(vdom, container)))
      .subscribe(subscriber)
    return () => {
      subscription.unsubscribe()
      ReactDOM.unmountComponentAtNode(container)
    }
  })

const mountNode = document.getElementById('main')
if (!mountNode) {
  throw new Error('No element with id "main" found')
}

const sub = App$.pipe(
  render(mountNode)
  // takeUntil(timer(2000))
).subscribe()

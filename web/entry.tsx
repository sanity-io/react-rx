import * as React from 'react'
import * as ReactDOM from 'react-dom'
import {Observable} from 'rxjs'
import {distinctUntilChanged, map} from 'rxjs/operators'
import {App} from './App'
import {component} from '../src'

const hash$: Observable<string> = new Observable(subscriber => {
  const emitHash = () => subscriber.next(window.location.hash)
  emitHash()
  window.addEventListener('hashchange', emitHash, false)
  return () => {
    window.removeEventListener('hashchange', emitHash, false)
  }
})

const selectedExample$ = hash$.pipe(
  map(hash => hash.substring(1)),
  distinctUntilChanged(),
)

const Main = component(
  selectedExample$.pipe(map(selectedExample => <App selectedExampleName={selectedExample} />)),
)

ReactDOM.render(<Main />, document.getElementById('app'))

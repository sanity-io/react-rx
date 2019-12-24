import {reactiveComponent} from '../../src'
import {location$} from '../datastores/location'
import {pages} from './pages'
import {map, switchMap} from 'rxjs/operators'
import * as React from 'react'

export const Router = reactiveComponent(
  location$.pipe(
    switchMap(location => {
      const found = pages.find(page => page.route === location.pathname)
      return found ? found.load() : import('./NotFound')
    }),
    map(({Page}) => {
      return <Page />
    }),
  ),
)

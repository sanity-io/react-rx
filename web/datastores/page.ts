import {map} from 'rxjs/operators'
import {location$} from './location'
import {pages} from '../pages/pages'

export const page$ = location$.pipe(
  map(location => pages.find(page => page.route === location.pathname) || null)
)

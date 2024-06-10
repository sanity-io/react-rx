import {Observable} from 'rxjs'
import {map} from 'rxjs/operators'

import {NOT_FOUND, Page, pages} from '../_pages/pages'
import {location$} from './location'

export const page$: Observable<Page> = location$.pipe(
  map((location) => pages.find((page) => page.route === location.pathname) || NOT_FOUND),
)

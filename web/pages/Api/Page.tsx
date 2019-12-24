import {reactiveComponent} from '../../../src/reactiveComponent'
import {location$} from '../../datastores/location'
import {map, tap} from 'rxjs/operators'
import {Api} from './Api'
import * as React from 'react'

export const Page = reactiveComponent(
  location$.pipe(map(location => <Api selectedExampleName={location.hash?.substring(1)} />)),
)

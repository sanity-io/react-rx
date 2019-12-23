import {reactiveComponent} from '../../../src/reactiveComponent'
import {location$} from '../../utils/location'
import {map, tap} from 'rxjs/operators'
import {Examples} from './Examples'
import * as React from 'react'

export const Page = reactiveComponent(
  location$.pipe(map(location => <Examples selectedExampleName={location.hash?.substring(1)} />)),
)

import * as React from 'react'
import {rxComponent} from 'react-rx'
import {map} from 'rxjs/operators'

import {location$} from '../../datastores/location'
import {Examples} from './Examples'

export const ExamplesPage = rxComponent(
  location$.pipe(
    map((location) => (
      <Examples selectedExampleName={location.hash?.substring(1)} />
    ))
  )
)

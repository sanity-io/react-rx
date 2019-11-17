import * as React from 'react'
import * as rxjs from 'rxjs'
import * as operators from 'rxjs/operators'
import {formatDistance} from 'date-fns'
import {reactiveComponent} from '../../../src'
//@endimports

const {combineLatest, timer} = rxjs
const {map, share, take} = operators

const UPDATE_INTERVAL = 1000
const currentTime$ = timer(0, UPDATE_INTERVAL).pipe(
  take(10),
  map(() => new Date()),
  share()
)

interface OwnerProps {
  time: Date
  includeSeconds?: boolean
}

const TimeDistance = reactiveComponent<OwnerProps>(props$ =>
  combineLatest<[Date, OwnerProps]>([currentTime$, props$]).pipe(
    map(([currentTime, ownerProps]) =>
      formatDistance(ownerProps.time, currentTime, {
        includeSeconds: ownerProps.includeSeconds
      })
    )
  )
)

const NOW = new Date()
const PassThroughPropsExample = () => (
  <>
    <h2>
      With <code>includeSeconds</code> true
    </h2>
    With synchronized updates
    <p>
      Page loaded <TimeDistance time={NOW} includeSeconds /> ago
    </p>
    <p>
      Page loaded <TimeDistance time={NOW} includeSeconds /> ago
    </p>
    <h2>
      Without <code>includeSeconds</code>
    </h2>
    <p>
      Page loaded <TimeDistance time={NOW} /> ago
    </p>
  </>
)

render(<PassThroughPropsExample />)

import {
  React,
  ReactDOM,
  component,
  share,
  take,
  timer,
  map,
  combineLatest
} from '../_utils/globalScope'
import {formatDistance} from 'date-fns'
//@endimport

const UPDATE_INTERVAL = 1000
const currentTime$ = timer(0, UPDATE_INTERVAL).pipe(
  take(10),
  map(() => new Date()),
  share()
)

const TimeDistance = component(props$ =>
  combineLatest([currentTime$, props$]).pipe(
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

ReactDOM.render(
  <PassThroughPropsExample />,
  document.getElementById('pass-through-props')
)

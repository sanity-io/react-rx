import {
  reactiveComponent,
  map,
  React,
  ReactDOM,
  timer
} from '../_utils/globalScope'
//@endimport

// This will only show even numbers
const Counter = reactiveComponent(
  timer(0, 1000).pipe(map(seconds => <div>Seconds: {seconds}</div>))
)

ReactDOM.render(<Counter />, document.getElementById('counter'))

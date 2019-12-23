import {
  reactiveComponent,
  map,
  React,
  ReactDOM,
  timer
} from '../_utils/globalScope'
//@endimport

const Counter = reactiveComponent(
  timer(0, 1000).pipe(map(seconds => <>Seconds: {seconds}</>))
)

ReactDOM.render(<Counter />, document.getElementById('counter-example'))

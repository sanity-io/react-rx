import {
  component,
  map,
  React,
  ReactDOM,
  scan,
  timer
} from '../_utils/globalScope'
import {createEventHandler} from '../../../src/common'
import {of} from 'rxjs'
//@endimport

const CONTAINER = {
  display: 'flex',
  alignItems: 'center',
  position: 'relative',
  height: 200,
  width: 200,
  textAlign: 'center'
}

const BADGE = {
  borderRadius: 26,
  backgroundColor: 'red',
  padding: 4,
  height: 26,
  width: 26
}

const [clicks$, click] = createEventHandler()
const clickCount$ = clicks$.pipe(scan(count => count + 1, 0))

const ClickCountBadge = component(
  clickCount$.pipe(map(clicks => <span style={BADGE}>{clicks}</span>))
)

const Clicker = component(of(<button onClick={click}>CLICK ME!</button>))

const Example = (
  <div style={CONTAINER}>
    <div style={{position: 'absolute', top: 0, left: 0}}>
      <ClickCountBadge />
    </div>
    <div style={{position: 'absolute', top: 0, right: 0}}>
      <ClickCountBadge />
    </div>
    <div style={{width: '100%'}}>
      <Clicker />
    </div>
    <div style={{position: 'absolute', bottom: 0, left: 0}}>
      <ClickCountBadge />
    </div>
    <div style={{position: 'absolute', bottom: 0, right: 0}}>
      <ClickCountBadge />
    </div>
  </div>
)
ReactDOM.render(Example, document.getElementById('counter'))

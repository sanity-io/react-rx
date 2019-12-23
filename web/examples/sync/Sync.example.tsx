import * as React from 'react'
import {from, ReactDOM, reactiveComponent} from '../_utils/globalScope'
//@endimport

const Sync = reactiveComponent(
  from(['This', 'will', 'only', 'render', 'once!'])
)

ReactDOM.render(<Sync />, document.getElementById('counter-example'))

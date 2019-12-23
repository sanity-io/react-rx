import {reactiveComponent, of, React, ReactDOM} from '../_utils/globalScope'
//@endimport

const HelloWorld = reactiveComponent(of(<div>Hello World!</div>))

ReactDOM.render(<HelloWorld />, document.getElementById('hello-world-example'))

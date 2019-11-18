import {component, of, React, ReactDOM} from '../_utils/globalScope'
//@endimport

const HelloWorld = component(of(<div>Hello World!</div>))

ReactDOM.render(<HelloWorld />, document.getElementById('hello-world'))

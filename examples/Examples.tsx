import * as React from 'react'
import ContextExample from './reactive-component/context'
import ErrorsExample from './reactive-component/errors'
import EventHandlersExample from './reactive-component/event-handlers'
import FetchExample from './reactive-component/fetch'
import FormDataExample from './reactive-component/form-data'
import ForwardRefExample from './reactive-component/forward-ref'
import PassThroughPropsExample from './reactive-component/passthrough-props'
import SimpleExample from './reactive-component/simple'
import TickExample from './reactive-component/tick'
import UseReactiveStateExample from './reactive-component/use-reactive-state'
import SearchExample from './use-observable/search'
import UseObservableExample from './use-observable/use-observable'
import ReadmeExamples from './readme-examples'
import SyncExample from './sync'
import {CodeBlock} from './components/CodeBlock'
import styles from './Examples.module.css'
import {Grid, Cell} from 'styled-css-grid'
import FizzBuzzExample from './reactive-component/FizzBuzz'

export interface Example {
  title: string
  type: string
  source: string
  component: React.ComponentType
}

const examples: {[exampleName: string]: Example} = {
  syncExample: SyncExample,
  forwardRef: ForwardRefExample,
  context: ContextExample,
  errors: ErrorsExample,
  'event-handlers': EventHandlersExample,
  fetch: FetchExample,
  'form-data': FormDataExample,
  hooks: UseReactiveStateExample,
  'passthrough-props': PassThroughPropsExample,
  readme: ReadmeExamples,
  search: SearchExample,
  simple: SimpleExample,
  fizzBuzz: FizzBuzzExample,
  tick: TickExample,
  'with-observable': UseObservableExample,
}

const LINK_STYLE = {
  padding: 4,
  display: 'block',
}
const SELECTED_LINK_STYLE = {
  ...LINK_STYLE,
  backgroundColor: '#444',
}

export function Examples(props: {selectedExampleName: string}) {
  const {selectedExampleName} = props
  const selectedExample = examples[selectedExampleName] || examples[Object.keys(examples)[0]]
  return (
    <Grid columns={'1fr 2fr 3fr'} gap="1em">
      <Cell style={{padding: '1em'}}>
        <h4>Examples</h4>
        <hr />
        {Object.keys(examples).map(exampleName => (
          <a
            style={selectedExample === examples[exampleName] ? SELECTED_LINK_STYLE : LINK_STYLE}
            key={exampleName}
            href={`#${exampleName}`}
          >
            {examples[exampleName].title}
          </a>
        ))}
      </Cell>
      <Cell style={{backgroundColor: '#333', padding: '1em'}}>
        <h4>{selectedExample.title}</h4>
        <hr />
        <selectedExample.component />
      </Cell>
      <Cell style={{padding: '1em'}}>
        <h4>Source (TypeScript)</h4>
        <hr />
        <div className={styles.code}>
          <CodeBlock source={selectedExample.source} />
        </div>
      </Cell>
    </Grid>
  )
}

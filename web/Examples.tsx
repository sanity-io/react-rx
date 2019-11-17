import * as React from 'react'
import {ContextExample} from './reactive-component/context'
import {ErrorsExample} from './reactive-component/errors'
import {EventHandlersExample} from './reactive-component/event-handlers'
import {FetchExample} from './reactive-component/fetch'
import {FormDataExample} from './reactive-component/form-data'
import {ForwardRefExample} from './reactive-component/forward-ref'
import {PassThroughPropsExample} from './reactive-component/passthrough-props'
import {SimpleExample} from './reactive-component/simple'
import {TickExample} from './reactive-component/tick'
import {UseReactiveStateExample} from './reactive-component/use-reactive-state'
import SearchExample from './use-observable/search'
import UseObservableExample from './use-observable/use-observable'
// import ReadmeExamples from './readme-examples'
import SyncExample from './sync'
import {CodeBlock} from './components/CodeBlock'
import styled from 'styled-components'
import FizzBuzzExample from './reactive-component/FizzBuzz'

export interface Example {
  name: string
  title: string
  type: string
  source: string
  scope?: {[variableName: string]: any}
}

const reactiveComponentExamples: Example[] = [
  ContextExample,
  ErrorsExample,
  EventHandlersExample,
  FetchExample,
  FormDataExample,
  ForwardRefExample,
  PassThroughPropsExample,
  SimpleExample,
  TickExample,
  UseReactiveStateExample,
  FizzBuzzExample,
]

const useObservableExamples: Example[] = [
  SearchExample,
  UseObservableExample,
  // ReadmeExamples,
  SyncExample,
]

const LINK_STYLE = {
  padding: 4,
  display: 'inline-block',
}
const SELECTED_LINK_STYLE = {
  ...LINK_STYLE,
  backgroundColor: '#444',
}

export function Examples(props: {selectedExampleName: string}) {
  const {selectedExampleName} = props
  // const selectedExample = examples.find(ex => ex.name === selectedExampleName) || examples[0]

  return (
    <div style={{margin: 10}}>
      <div style={{position: 'sticky', top: 0, background: '#222', padding: 10, zIndex: 1}}>
        {reactiveComponentExamples.map(ex => (
          <a
            style={selectedExampleName === ex.name ? SELECTED_LINK_STYLE : LINK_STYLE}
            key={ex.name}
            href={`#${ex.name}`}
          >
            {ex.title}
          </a>
        ))}
      </div>
      <div style={{paddingTop: '1em'}}>
        {reactiveComponentExamples.map(ex => (
          <div key={ex.name}>
            <h2 id={ex.name}>{ex.title}</h2>
            <CodeBlock source={ex.source} scope={ex.scope} />
          </div>
        ))}
      </div>
    </div>
  )
}

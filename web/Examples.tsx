import * as React from 'react'
import {ContextExample} from './examples/context'
import {ErrorsExample} from './examples/errors'
import {EventHandlersExample} from './examples/event-handlers'
import {FetchExample} from './examples/fetch'
import {FormDataExample} from './examples/form-data'
import {ForwardRefExample} from './examples/forward-ref'
import {PassThroughPropsExample} from './examples/passthrough-props'
import {TickExample} from './examples/tick'
import {UseReactiveStateExample} from './examples/use-state'
// import ReadmeExamples from './readme-examples'
import {CodeBlock} from './components/repl'
import {FizzBuzzExample} from './examples/FizzBuzz'
import {TodoAppExample} from './examples/todo-app'
import {HelloWorldExample} from './examples/hello-world'
import {SimpleExample} from './examples/simple'
import {SharedStateExample} from './examples/shared-state'
import {UseElementExample} from './examples/use-element'
import {AnimationExample} from './examples/animation'
import {SyncExample} from './examples/sync'

export interface Example {
  id: string
  title: string
  source: string
  description?: string
  scope?: {[variableName: string]: any}
}

const reactiveComponentExamples: Example[] = [
  HelloWorldExample,
  SimpleExample,
  UseReactiveStateExample,
  TodoAppExample,
  AnimationExample,
  UseElementExample,
  SharedStateExample,
  ContextExample,
  ErrorsExample,
  EventHandlersExample,
  FetchExample,
  SyncExample,
  FormDataExample,
  ForwardRefExample,
  PassThroughPropsExample,
  TickExample,
  FizzBuzzExample,
]
//
// const useObservableExamples: Example[] = [
//   SearchExample,
//   UseObservableExample,
//   // ReadmeExamples,
//   SyncExample,
// ]

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
  const selectedExample =
    reactiveComponentExamples.find(ex => ex.id === selectedExampleName) ||
    reactiveComponentExamples[0]

  return (
    <div style={{margin: 10}}>
      <div style={{position: 'sticky', top: 0, padding: 10, zIndex: 1}}>
        {reactiveComponentExamples.map(ex => (
          <a
            style={selectedExampleName === ex.id ? SELECTED_LINK_STYLE : LINK_STYLE}
            key={ex.id}
            href={`#${ex.id}`}
          >
            {ex.title}
          </a>
        ))}
      </div>
      <div style={{paddingTop: '1em'}}>
        {reactiveComponentExamples
          .filter(ex => ex === selectedExample)
          .map(ex => (
            <div key={ex.id}>
              <h2>{ex.title}</h2>
              {ex.description && <p>{ex.description}</p>}
              <CodeBlock source={ex.source} scope={ex.scope} filename={`${ex.id}.tsx`} />
            </div>
          ))}
      </div>
    </div>
  )
}

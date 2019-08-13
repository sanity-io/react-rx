import * as React from 'react'
import {DemoExample} from './demo'
import {ErrorsExample} from './errors'
import {EventHandlersExample} from './event-handlers'
import {FetchExample} from './fetch'
import {FormDataExample} from './form-data'
import {HooksExample} from './hooks'
import {PassThroughPropsExample} from './passthrough-props'
import {ReadmeExamples} from './readme-examples'
import {SearchExample} from './search'
import {SimpleExample} from './simple'
import {SyncExample} from './sync'
import {TickExample} from './tick'
import {WithObservableExample} from './with-observable'

interface Example {
  title: string
  component: React.ComponentType
}

const examples: {[exampleName: string]: Example} = {
  demo: {title: 'Demo', component: DemoExample},
  errors: {title: 'Errors', component: ErrorsExample},
  'event-handlers': {title: 'Event handlers', component: EventHandlersExample},
  fetch: {title: 'Fetch', component: FetchExample},
  'form-data': {title: 'Form data', component: FormDataExample},
  hooks: {title: 'Hooks', component: HooksExample},
  'passthrough-props': {title: 'Pass through props', component: PassThroughPropsExample},
  readme: {title: 'Readme examples', component: ReadmeExamples},
  search: {title: 'Search', component: SearchExample},
  simple: {title: 'Simple', component: SimpleExample},
  sync: {title: 'Sync', component: SyncExample},
  tick: {title: 'Tick', component: TickExample},
  'with-observable': {title: 'With observable', component: WithObservableExample}
}

const LINK_STYLE = {
  padding: 4
}
const SELECTED_LINK_STYLE = {
  ...LINK_STYLE,
  backgroundColor: '#dddddd'
}

export function Examples(props: {selectedExampleName: string}) {
  const {selectedExampleName} = props
  const selectedExample = examples[selectedExampleName] || examples[Object.keys(examples)[0]]
  const ExampleComponent = selectedExample.component
  return (
    <>
      {Object.keys(examples).map(exampleName => (
        <a
          key={exampleName}
          href={`#${exampleName}`}
          style={selectedExample === examples[exampleName] ? SELECTED_LINK_STYLE : LINK_STYLE}
        >
          {examples[exampleName].title}
        </a>
      ))}
      <h2>{selectedExample.title}</h2>
      <ExampleComponent />
    </>
  )
}

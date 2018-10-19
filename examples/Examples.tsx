import * as React from 'react'
import {FetchExample} from './fetch'
import {SearchExample} from './search'
import {SimpleExample} from './simple'
import {SyncExample} from './sync'

interface Example {
  title: string
  component: React.ComponentType
}

const examples: {[exampleName: string]: Example} = {
  search: {title: 'Search', component: SearchExample},
  sync: {title: 'Sync', component: SyncExample},
  simple: {title: 'Simple', component: SimpleExample},
  fetch: {title: 'Fetch', component: FetchExample}
}

interface State {
  selectedExampleName: string
}
export class Examples extends React.Component {
  state: State = {
    selectedExampleName: 'search'
  }
  render() {
    const {selectedExampleName} = this.state
    const selectedExample = examples[selectedExampleName]
    const ExampleComponent = selectedExample.component
    return (
      <>
        Select example:
        {Object.keys(examples).map(exampleName => (
          <label key={exampleName}>
            <input
              name="example"
              type="radio"
              checked={exampleName === selectedExampleName}
              onChange={() => this.setState({selectedExampleName: exampleName})}
            />
            {examples[exampleName].title}
          </label>
        ))}
        <h2>Example: {selectedExample.title}</h2>
        <ExampleComponent />
      </>
    )
  }
}

import * as React from 'react'

import {Header} from '../../components/Header'
import {Link} from '../../components/Link'
// // import ReadmeExamples from './readme-examples'
import {CodeBlock} from '../../components/repl'
import {Sidebar} from '../../components/Sidebar'
import {AnimationExample} from '../../examples/animation'
import {ContextExample} from '../../examples/context'
import {ErrorsExample} from '../../examples/errors'
import {EventHandlersExample} from '../../examples/event-handlers'
import {FetchExample} from '../../examples/fetch'
import {FizzBuzzExample} from '../../examples/FizzBuzz'
import {FormDataExample} from '../../examples/form-data'
import {ForwardRefExample} from '../../examples/forward-ref'
import {HelloWorldExample} from '../../examples/hello-world'
import {HooksInteropExample} from '../../examples/hooks-interop'
import {PassThroughPropsExample} from '../../examples/passthrough-props'
import {ReactiveStateExample} from '../../examples/reactive-state'
import {SharedStateExample} from '../../examples/shared-state'
import {SimpleExample} from '../../examples/simple'
import {SyncExample} from '../../examples/sync'
import {TickExample} from '../../examples/tick'
import {TodoAppExample} from '../../examples/todo-app'
import {UseElementExample} from '../../examples/use-element'
import {SearchExample} from '../../examples/use-observable/search'
import {UseObservableExample} from '../../examples/use-observable/use-observable'
import {Container, Content} from '../styles'

export interface Example {
  id: string
  title: string
  source: string
  description?: string
  scope?: {[variableName: string]: any}
  prelude?: string
}

const rxComponentExamples: Example[] = [
  HelloWorldExample,
  SimpleExample,
  ReactiveStateExample,
  TodoAppExample,
  HooksInteropExample,
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

const useObservableExamples: Example[] = [UseObservableExample, SearchExample]

const allExamples = rxComponentExamples.concat(useObservableExamples)

export function Examples(props: {selectedExampleName: string}) {
  const {selectedExampleName} = props
  const selectedExample = allExamples.find((ex) => ex.id === selectedExampleName) || allExamples[0]

  return (
    <>
      <Header />
      <Container>
        <Sidebar heading="Examples">
          <ul>
            {allExamples.map((ex) => (
              <li key={ex.id}>
                <Link
                  className={selectedExampleName === ex.id ? 'selected' : ''}
                  href={`#${ex.id}`}
                >
                  {ex.title}
                </Link>
              </li>
            ))}
          </ul>
        </Sidebar>
        <Content>
          {allExamples
            .filter((ex) => ex === selectedExample)
            .map((ex) => (
              <div key={ex.id}>
                <h1>{ex.title}</h1>
                {ex.description && <p>{ex.description}</p>}
                <CodeBlock
                  source={ex.source}
                  scope={ex.scope}
                  prelude={ex.prelude}
                  filename={`${ex.id}.tsx`}
                />
              </div>
            ))}
        </Content>
      </Container>
    </>
  )
}

import * as React from 'react'
import {ContextExample} from '../../examples/context'
import {ErrorsExample} from '../../examples/errors'
import {EventHandlersExample} from '../../examples/event-handlers'
import {FetchExample} from '../../examples/fetch'
import {FormDataExample} from '../../examples/form-data'
import {ForwardRefExample} from '../../examples/forward-ref'
import {PassThroughPropsExample} from '../../examples/passthrough-props'
import {TickExample} from '../../examples/tick'
import {UseReactiveStateExample} from '../../examples/use-state'
// import ReadmeExamples from './readme-examples'
import {CodeBlock} from '../../components/repl'
import {FizzBuzzExample} from '../../examples/FizzBuzz'
import {TodoAppExample} from '../../examples/todo-app'
import {HelloWorldExample} from '../../examples/hello-world'
import {SimpleExample} from '../../examples/simple'
import {SharedStateExample} from '../../examples/shared-state'
import {UseElementExample} from '../../examples/use-element'
import {AnimationExample} from '../../examples/animation'
import {SyncExample} from '../../examples/sync'
import {Link} from '../../components/Link'
import {Header} from '../../components/Header'
import {Container, Content, ContentInner, Sidebar} from '../styles'

export interface Example {
  id: string
  title: string
  source: string
  description?: string
  scope?: {[variableName: string]: any}
  prelude?: string
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

export function Examples(props: {selectedExampleName: string}) {
  const {selectedExampleName} = props
  const selectedExample =
    reactiveComponentExamples.find(ex => ex.id === selectedExampleName) ||
    reactiveComponentExamples[0]

  return (
    <>
      <Header />
      <Container>
        <Sidebar>
          <ul>
            {reactiveComponentExamples.map(ex => (
              <li>
                <Link
                  className={selectedExampleName === ex.id ? 'selected' : ''}
                  key={ex.id}
                  href={`#${ex.id}`}
                >
                  {ex.title}
                </Link>
              </li>
            ))}
          </ul>
        </Sidebar>
        <Content>
          <ContentInner>
            {reactiveComponentExamples
              .filter(ex => ex === selectedExample)
              .map(ex => (
                <div key={ex.id}>
                  <h2>{ex.title}</h2>
                  {ex.description && <p>{ex.description}</p>}
                  <CodeBlock
                    source={ex.source}
                    scope={ex.scope}
                    prelude={ex.prelude}
                    filename={`${ex.id}.tsx`}
                  />
                </div>
              ))}
          </ContentInner>
        </Content>
      </Container>
    </>
  )
}

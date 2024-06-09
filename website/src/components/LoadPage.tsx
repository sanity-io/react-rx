import * as React from 'react'
import {rxComponent} from 'react-rx'
import {concat, from, of} from 'rxjs'
import {map, scan, switchMap} from 'rxjs/operators'

import {Page} from '../pages/pages'
import {Container, Content} from '../pages/styles'
import {Header} from './Header'

interface Props {
  page: Page
}

interface PageWrapperProps {
  title: string
  isLoading: boolean
  component: React.ComponentType<any>
}

const PageWrapper = (props: PageWrapperProps) => {
  return (
    <>
      <div style={{position: 'fixed', top: 0, zIndex: 10000}}>
        {props.isLoading ? `Loading ` : 'Loaded '}
        {props.title}
      </div>
      {props.component && <props.component />}
    </>
  )
}

const INITIAL_COMPONENT = () => (
  <>
    <Header />
    <Container>
      <Content>Loading</Content>
    </Container>
  </>
)

export const LoadPage = rxComponent<Props>((props$) => {
  return props$.pipe(
    map((props) => props.page),
    switchMap((page) =>
      concat(
        of({title: page.title, isLoading: true, component: INITIAL_COMPONENT}),
        from(page.load()).pipe(
          map((component) => ({
            isLoading: false,
            title: page.title,
            component
          }))
        )
      )
    ),
    scan((prev, next) => ({...prev, ...next})),
    map(({isLoading, title, component}) => (
      <PageWrapper title={title} component={component} isLoading={isLoading} />
    ))
  )
})

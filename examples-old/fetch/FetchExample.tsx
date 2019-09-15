import * as React from 'react'
import {distinctUntilChanged, map, switchMap} from 'rxjs/operators'
import {withPropsStream} from '../../src/withPropsStream'

interface Props {
  url: string
}
const FetchComponent: React.ComponentType<Props> = withPropsStream(
  props$ =>
    props$.pipe(
      map((props: Props) => props.url),
      distinctUntilChanged(),
      switchMap(url => fetch(url).then(response => response.text())),
      map(responseText => ({responseText}))
    ),
  props => <div>The result was: {props.responseText}</div>
)

const URLS = ['/fetch/a.txt', '/fetch/b.txt']

export class FetchExample extends React.Component {
  state = {currentUrl: ''}
  render() {
    const {currentUrl} = this.state
    return (
      <div>
        <p>
          {URLS.map(url => (
            <button key={url} onClick={() => this.setState({currentUrl: url})}>
              {url}
            </button>
          ))}
        </p>
        {currentUrl ? <FetchComponent url={currentUrl} /> : 'Click on url to fetch'}
      </div>
    )
  }
}

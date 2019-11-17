import * as React from 'react'
import * as operators from 'rxjs/operators'
import {component} from '../../../src'
import {render} from '../../utils/eval-render-noop'
//@endimports

const {distinctUntilChanged, map, switchMap} = operators

interface Props {
  url: string
}

const FetchComponent = component<Props>(props$ =>
  props$.pipe(
    map((props: Props) => props.url),
    distinctUntilChanged(),
    switchMap((url: string) => fetch(url).then(response => response.text())),
    map(responseText => <div>The result was: {responseText}</div>)
  )
)

const URLS = ['/fetch/a.txt', '/fetch/b.txt']

function FetchExample() {
  const [currentUrl, setCurrentUrl] = React.useState('')
  return (
    <div>
      <p>
        {URLS.map(url => (
          <button key={url} onClick={() => setCurrentUrl(url)}>
            {url}
          </button>
        ))}
      </p>
      {currentUrl ? <FetchComponent url={currentUrl} /> : 'Click on url to fetch'}
    </div>
  )
}

render(<FetchExample />)

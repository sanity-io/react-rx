import * as React from 'react'
import * as ReactDOM from 'react-dom'
import * as RxJS from 'rxjs'
import * as operators from 'rxjs/operators'

const {of, from, concat, merge} = RxJS
const {
  timer,
  interval,
  throwError,
  combineLatest,
  Observable,
} = RxJS

const {map, filter, reduce, scan, tap} = operators
const {concatMap, mergeMap, switchMap, mapTo} =
  operators
const {startWith, catchError, take} = operators
//@endimport

import {observableCallback} from 'observable-callback'
import {
  context,
  elementRef,
  forwardRef,
  handler,
  rxComponent,
  state,
  useAsObservable,
  useMemoObservable,
  useObservable,
} from 'react-rx-old'

const {distinctUntilChanged} = operators

const FetchComponent = rxComponent((props$) =>
  props$.pipe(
    map((props) => props.url),
    distinctUntilChanged(),
    switchMap((url) =>
      fetch(url).then((response) =>
        response.text(),
      ),
    ),
    map((responseText) => (
      <div>The result was: {responseText}</div>
    )),
  ),
)

const URLS = ['/fetch/a.txt', '/fetch/b.txt']

function FetchExample() {
  const [currentUrl, setCurrentUrl] =
    React.useState('')
  return (
    <div>
      <p>
        {URLS.map((url) => (
          <button
            key={url}
            onClick={() => setCurrentUrl(url)}
          >
            {url}
          </button>
        ))}
      </p>
      {currentUrl ? (
        <FetchComponent url={currentUrl} />
      ) : (
        <>Click on url to fetch</>
      )}
    </div>
  )
}

ReactDOM.render(
  <FetchExample />,
  document.getElementById('fetch-example'),
)

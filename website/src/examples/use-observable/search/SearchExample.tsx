import * as React from 'react'
import * as ReactDOM from 'react-dom'
import {Observable} from 'rxjs'
import * as RxJS from 'rxjs'
import * as operators from 'rxjs/operators'

const {of, from, concat, merge} = RxJS
const {
  timer,
  interval,
  throwError,
  combineLatest,
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

const {distinctUntilChanged, debounceTime} =
  operators

interface SearchResult {
  keyword: string
  hits: Hit[]
}

interface Hit {
  title: string
}

const range = (len: number) => {
  const res = []
  for (let i = 0; i <= len; i++) {
    res.push(null)
  }
  return res
}

// A search function that takes longer time to complete for shorter keywords
// e.g. a keyword of one character takes 9 seconds while a keyword of 9 characters takes 1 second
const search = (
  keyword: string,
): Observable<SearchResult> => {
  const delay = Math.max(
    1,
    Math.round(10 - keyword.length),
  )
  return timer(delay * 200).pipe(
    map(() =>
      range(delay).map((_, i) => ({
        title: `Hit #${i}`,
      })),
    ),
    map((hits) => ({
      keyword,
      hits,
    })),
  )
}

function SearchExample() {
  const [keyword, setKeyword] = React.useState('')
  return (
    <>
      <input
        type="search"
        style={{
          width: '100%',
        }}
        value={keyword}
        placeholder="Type a keyword to search"
        onChange={(event) =>
          setKeyword(event.target.value)
        }
      />
      <div>
        The more characters you type, the faster
        the results will appear
      </div>
      {useMemoObservable(
        () =>
          of(keyword).pipe(
            debounceTime(200),
            distinctUntilChanged(),
            filter((v) => v !== ''),
            switchMap((kw: string) => search(kw)),
            map((result: SearchResult) => (
              <>
                <h1>
                  Searched for {result.keyword}
                </h1>
                <div>
                  Got {result.hits.length} hits
                </div>
                <ul>
                  {result.hits.map((hit, i) => (
                    <li key={i}>{hit.title}</li>
                  ))}
                </ul>
              </>
            )),
          ),
        [keyword],
      )}
    </>
  )
}

export default SearchExample

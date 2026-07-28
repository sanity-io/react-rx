import {
  ChangeEvent,
  useDeferredValue,
  useMemo,
} from 'react'
import {
  useObservable,
  useObservableEvent,
} from 'react-rx'
import {Observable, Subject} from 'rxjs'
import {timer} from 'rxjs'
import {
  distinctUntilChanged,
  filter,
  map,
  switchMap,
  tap,
} from 'rxjs/operators'

interface SearchResult {
  keyword: string
  hits: Hit[]
}

interface Hit {
  title: string
}

const range = (len: number) => {
  const res: null[] = []
  for (let i = 0; i <= len; i++) {
    res.push(null)
  }
  return res
}

// Create subject for search input
const keyword$ = new Subject<string>()

// A search function that takes longer time to complete for shorter keywords
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
  // Handle input changes
  const handleInput = useObservableEvent<
    ChangeEvent<HTMLInputElement>,
    any
  >((input$) =>
    input$.pipe(
      map((e) => e.currentTarget.value),
      tap((value) => keyword$.next(value)),
    ),
  )

  // Create search results stream
  const results$ = useMemo(
    () =>
      keyword$.pipe(
        distinctUntilChanged(),
        filter((v) => v !== ''),
        switchMap((kw: string) => search(kw)),
        map((result: SearchResult) => (
          <>
            <h1>Searched for {result.keyword}</h1>
            <div>
              Got {result.hits.length} hits
            </div>
            <ul>
              {result.hits.map((hit) => (
                <li key={hit.title}>{hit.title}</li>
              ))}
            </ul>
          </>
        )),
      ),
    [],
  )

  const keyword = useObservable(keyword$, '')
  const results = useObservable(results$)
  // Uses React Concurrent Rendering to defer rendering of results if the search query changes before the results are done rendering
  const deferredResults =
    useDeferredValue(results)

  return (
    <>
      <input
        type="search"
        style={{width: '100%'}}
        value={keyword}
        placeholder="Type a keyword to search"
        onChange={handleInput}
      />
      <div>
        The more characters you type, the faster
        the results will appear
      </div>
      {deferredResults}
    </>
  )
}

export default SearchExample

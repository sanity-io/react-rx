import {useMemo} from 'react'
import {
  useObservable,
  useSyncObservable,
} from 'react-rx'
import {
  distinctUntilChanged,
  filter,
  map,
  Observable,
  Subject,
  switchMap,
  timer,
} from 'rxjs'

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

// Search input pushes into a Subject
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
    map((hits) => ({keyword, hits})),
  )
}

function SearchExample() {
  // Search results stream: switchMap cancels the previous search when a new
  // keyword arrives, so out-of-order responses can never win.
  const results$ = useMemo(
    () =>
      keyword$.pipe(
        distinctUntilChanged(),
        filter((v) => v !== ''),
        switchMap((kw: string) => search(kw)),
        map((result: SearchResult) => (
          <>
            <h4>Searched for {result.keyword}</h4>
            <div>
              Got {result.hits.length} hits
            </div>
            <ul>
              {result.hits.map((hit) => (
                <li key={hit.title}>
                  {hit.title}
                </li>
              ))}
            </ul>
          </>
        )),
      ),
    [],
  )

  // Controlled input value must update synchronously.
  const keyword = useSyncObservable(keyword$, '')
  // Results are deferred by default via useObservable (no manual useDeferredValue).
  const results = useObservable(results$)

  return (
    <>
      <input
        type="search"
        value={keyword}
        placeholder="Type a keyword to search"
        onChange={(e) =>
          keyword$.next(e.currentTarget.value)
        }
      />
      <small>
        The more characters you type, the faster
        the results will appear
      </small>
      {results}
    </>
  )
}

export default SearchExample

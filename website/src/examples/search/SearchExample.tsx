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
  const results = useObservable(results$, null)

  return (
    <>
      <input
        type="search"
        style={{width: '100%'}}
        value={keyword}
        placeholder="Type a keyword to search"
        onChange={(event) =>
          keyword$.next(
            event.currentTarget.value,
          )
        }
      />
      <div>
        The more characters you type, the faster
        the results will appear
      </div>
      {results}
    </>
  )
}

export default SearchExample

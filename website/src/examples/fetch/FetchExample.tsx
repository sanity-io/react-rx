import {useMemo} from 'react'
import {useObservable} from 'react-rx'
import {
  distinctUntilChanged,
  map,
  Subject,
  switchMap,
} from 'rxjs'

// Create subject for URL changes
const url$ = new Subject<string>()

const origin = new URL('http://localhost:3000')
const URLS = [
  new URL('/fetch/a.txt', origin),
  new URL('/fetch/b.txt', origin),
]

function FetchExample() {
  // Create fetch response stream
  const response$ = useMemo(
    () =>
      url$.pipe(
        distinctUntilChanged(),
        switchMap((url) =>
          fetch(url).then((response) =>
            response.text(),
          ),
        ),
        map((responseText) => (
          <div>
            The result was: {responseText}
          </div>
        )),
      ),
    [],
  )

  const currentUrl = useObservable(url$, '')
  const response = useObservable(response$)

  return (
    <div>
      <p>
        {URLS.map((url) => (
          <button
            key={url.toString()}
            onClick={() =>
              url$.next(url.toString())
            }
          >
            {url.pathname}
          </button>
        ))}
      </p>
      {currentUrl ? (
        response
      ) : (
        <>Click on url to fetch</>
      )}
    </div>
  )
}

export default FetchExample

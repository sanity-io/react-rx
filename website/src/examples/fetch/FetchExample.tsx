import {useState} from 'react'
import {rxComponent} from 'react-rx-old'
import {
  distinctUntilChanged,
  map,
  switchMap,
} from 'rxjs/operators'

const FetchComponent = rxComponent((props$) =>
  props$.pipe(
    map((props: any) => props.url),
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

const VERCEL_URL =
  process.env.NEXT_PUBLIC_VERCEL_URL
const origin = new URL(
  VERCEL_URL
    ? `https://${VERCEL_URL}`
    : 'http://localhost:3000',
)

const URLS = [
  new URL('/fetch/a.txt', origin),
  new URL('/fetch/b.txt', origin),
]

function FetchExample() {
  const [currentUrl, setCurrentUrl] = useState('')
  return (
    <div>
      <p>
        {URLS.map((url) => (
          <button
            key={url.toString()}
            onClick={() =>
              setCurrentUrl(url.toString())
            }
          >
            {url.pathname}
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

export default FetchExample

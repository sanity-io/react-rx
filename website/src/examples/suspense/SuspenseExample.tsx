import {ChangeEvent, Suspense, use} from 'react'
import {
  useObservable,
  useObservableEvent,
  useSyncObservable,
} from 'react-rx'
import {map, Subject, tap} from 'rxjs'

// Shared by the input and both panels. Each hook file has its own
// WeakMap, so dual reads subscribe twice — fine for this demo.
const keyword$ = new Subject<string>()

type CacheEntry = {
  promise: Promise<string[]>
  value?: string[]
}

const resultsCache = new Map<string, CacheEntry>()

function searchHits(
  keyword: string,
): Promise<string[]> {
  let entry = resultsCache.get(keyword)
  if (!entry) {
    entry = {
      promise: new Promise((resolve) => {
        // Shorter keywords take longer — mirrors the search example.
        const delay = Math.max(
          200,
          (10 - keyword.length) * 80,
        )
        setTimeout(() => {
          const hits = Array.from(
            {length: Math.max(1, keyword.length)},
            (_, i) =>
              `Hit #${i + 1} for “${keyword}”`,
          )
          entry!.value = hits
          resolve(hits)
        }, delay)
      }),
    }
    resultsCache.set(keyword, entry)
  }
  return entry.promise
}

function SlowResults({
  keyword,
}: {
  keyword: string
}) {
  if (!keyword) {
    return (
      <p>Type to search — results suspend.</p>
    )
  }
  // use() suspends until the promise resolves (same idea as throwing a promise).
  const hits = use(searchHits(keyword))
  return (
    <ul>
      {hits.map((hit) => (
        <li key={hit}>{hit}</li>
      ))}
    </ul>
  )
}

function SyncPanel() {
  const keyword = useSyncObservable(keyword$, '')
  return (
    <section
      style={{
        flex: 1,
        border: '1px solid #ccc',
        padding: 12,
      }}
    >
      <h3>useSyncObservable</h3>
      <p style={{fontSize: 13, opacity: 0.8}}>
        Synchronous store updates. Typing discards
        visible results and shows the Suspense
        fallback (also logs React’s “suspended
        while responding to synchronous input”
        warning — open the console).
      </p>
      <Suspense
        fallback={<p>Loading results…</p>}
      >
        <SlowResults keyword={keyword} />
      </Suspense>
    </section>
  )
}

function DeferredPanel() {
  const keyword = useObservable(keyword$, '')
  // Dual read for the isStale dimming pattern (two module caches).
  const syncKeyword = useSyncObservable(
    keyword$,
    '',
  )
  const isStale = keyword !== syncKeyword
  return (
    <section
      style={{
        flex: 1,
        border: '1px solid #ccc',
        padding: 12,
        opacity: isStale ? 0.5 : 1,
      }}
    >
      <h3>useObservable</h3>
      <p style={{fontSize: 13, opacity: 0.8}}>
        Deferred store updates. Previous results
        stay on screen (dimmed while stale) until
        the new ones are ready — no fallback
        flash.
      </p>
      <Suspense
        fallback={<p>Loading results…</p>}
      >
        <SlowResults keyword={keyword} />
      </Suspense>
    </section>
  )
}

export default function App() {
  // Controlled input value must update synchronously.
  const keyword = useSyncObservable(keyword$, '')
  const handleInput = useObservableEvent<
    ChangeEvent<HTMLInputElement>,
    any
  >((input$) =>
    input$.pipe(
      map((e) => e.currentTarget.value),
      tap((value) => keyword$.next(value)),
    ),
  )

  return (
    <div>
      <input
        type="search"
        style={{width: '100%', marginBottom: 12}}
        value={keyword}
        placeholder="Type a keyword"
        onChange={handleInput}
      />
      <div
        style={{
          display: 'flex',
          gap: 12,
          alignItems: 'flex-start',
        }}
      >
        <SyncPanel />
        <DeferredPanel />
      </div>
    </div>
  )
}

import {Suspense, use} from 'react'
import {useObservable, useSyncObservable} from 'react-rx'
import {Subject} from 'rxjs'

// Shared by the input and both panels. Each hook file has its own
// WeakMap, so dual reads subscribe twice — fine for this demo.
const keyword$ = new Subject<string>()

type CacheEntry = {
  promise: Promise<string[]>
  value?: string[]
}

const resultsCache = new Map<string, CacheEntry>()

function searchHits(keyword: string): Promise<string[]> {
  let entry = resultsCache.get(keyword)
  if (!entry) {
    entry = {
      promise: new Promise((resolve) => {
        // Shorter keywords take longer — mirrors the search example.
        const delay = Math.max(200, (10 - keyword.length) * 80)
        setTimeout(() => {
          const hits = Array.from(
            {length: Math.max(1, keyword.length)},
            (_, i) => `Hit #${i + 1} for “${keyword}”`,
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

function SlowResults({keyword}: {keyword: string}) {
  if (!keyword) {
    return <p>Type to search — results suspend.</p>
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
    <article>
      <h4>useSyncObservable</h4>
      <small>
        Synchronous store updates. Typing discards visible results and shows the Suspense fallback
        (also logs React’s “suspended while responding to synchronous input” warning — open the
        console).
      </small>
      <Suspense fallback={<p aria-busy="true">Loading results…</p>}>
        <SlowResults keyword={keyword} />
      </Suspense>
    </article>
  )
}

function DeferredPanel() {
  const keyword = useObservable(keyword$, '')
  // Dual read for the isStale dimming pattern (two module caches).
  const syncKeyword = useSyncObservable(keyword$, '')
  const isStale = keyword !== syncKeyword
  return (
    <article style={{opacity: isStale ? 0.5 : 1}}>
      <h4>useObservable</h4>
      <small>
        Deferred store updates. Previous results stay on screen (dimmed while stale) until the new
        ones are ready — no fallback flash.
      </small>
      <Suspense fallback={<p aria-busy="true">Loading results…</p>}>
        <SlowResults keyword={keyword} />
      </Suspense>
    </article>
  )
}

export default function App() {
  // Controlled input value must update synchronously.
  const keyword = useSyncObservable(keyword$, '')

  return (
    <div>
      <input
        type="search"
        value={keyword}
        placeholder="Type a keyword"
        onChange={(e) => keyword$.next(e.currentTarget.value)}
      />
      <SyncPanel />
      <DeferredPanel />
    </div>
  )
}

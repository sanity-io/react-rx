import {Activity, Suspense, useMemo, useState} from 'react'
import {preloadObservablePromise} from 'react-rx'

import {fetchTab$} from './api'
import TabPanel from './TabPanel'

type Strategy = 'none' | 'preload' | 'activity'

const TABS = ['Posts', 'Photos', 'Settings'] as const

function TabButton({
  tab,
  active,
  strategy,
  onSelect,
}: {
  tab: (typeof TABS)[number]
  active: boolean
  strategy: Strategy
  onSelect: () => void
}) {
  const data$ = useMemo(() => fetchTab$(tab), [tab])

  return (
    <button
      type="button"
      onMouseEnter={() => {
        if (strategy === 'preload') {
          preloadObservablePromise(data$, {ttl: 10_000})
        }
      }}
      onClick={onSelect}
      style={{fontWeight: active ? 700 : 400}}
    >
      {tab}
    </button>
  )
}

export default function App() {
  const [strategy, setStrategy] = useState<Strategy>('none')
  const [active, setActive] = useState<(typeof TABS)[number]>('Posts')

  return (
    <div style={{fontFamily: 'system-ui', padding: 16, maxWidth: 480}}>
      <h2 style={{marginTop: 0}}>Prefetch strategies</h2>
      <p style={{fontSize: 14}}>
        Each tab fetch takes ~1s. Compare click-only loading vs hover preload vs
        hidden <code>Activity</code> pre-render.
      </p>

      <label style={{display: 'block', marginBottom: 12}}>
        Strategy:{' '}
        <select
          value={strategy}
          onChange={(e) => setStrategy(e.target.value as Strategy)}
        >
          <option value="none">No prefetch (fetch on reveal)</option>
          <option value="preload">Hover preload</option>
          <option value="activity">Activity pre-render</option>
        </select>
      </label>

      <div style={{display: 'flex', gap: 8, marginBottom: 16}}>
        {TABS.map((tab) => (
          <TabButton
            key={tab}
            tab={tab}
            active={active === tab}
            strategy={strategy}
            onSelect={() => setActive(tab)}
          />
        ))}
      </div>

      <Suspense fallback={<p style={{opacity: 0.7}}>🌀 Loading…</p>}>
        {strategy === 'activity' ? (
          TABS.map((tab) => (
            <Activity key={tab} mode={active === tab ? 'visible' : 'hidden'}>
              <TabPanel tab={tab} />
            </Activity>
          ))
        ) : (
          <TabPanel tab={active} />
        )}
      </Suspense>
    </div>
  )
}

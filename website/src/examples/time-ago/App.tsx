import {useState} from 'react'

import {TimeAgo} from './TimeAgo'

const LOCALES = ['en', 'es', 'fr', 'de']

export default function App() {
  // Fixed instants captured once, so each TimeAgo stream stays stable.
  const [samples] = useState(() => {
    const now = Date.now()
    return [
      {label: 'Just now', date: new Date(now)},
      {
        label: '45 seconds ago',
        date: new Date(now - 45_000),
      },
      {
        label: '5 minutes ago',
        date: new Date(now - 5 * 60_000),
      },
      {
        label: '3 hours ago',
        date: new Date(now - 3 * 3_600_000),
      },
      {
        label: '2 days ago',
        date: new Date(now - 2 * 86_400_000),
      },
    ]
  })
  const [locale, setLocale] = useState('en')

  return (
    <main>
      <p>
        <label>
          Locale{' '}
          <select
            value={locale}
            onChange={(event) =>
              setLocale(event.currentTarget.value)
            }
          >
            {LOCALES.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </select>
        </label>
      </p>
      <ul>
        {samples.map((sample) => (
          <TimeAgo
            key={sample.label}
            date={sample.date}
            locale={locale}
          />
        ))}
      </ul>
      <p>
        <small>
          Watch the emission counts: the seconds
          row climbs every second, while the hours
          and days rows stay put until their label
          actually changes.
        </small>
      </p>
    </main>
  )
}

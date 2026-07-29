import {use} from 'react'
import {useObservablePromise} from 'react-rx'
import {useMemo} from 'react'

import {fetchTab$} from './api'

export default function TabPanel({tab}: {tab: string}) {
  const data$ = useMemo(() => fetchTab$(tab), [tab])
  const data = use(useObservablePromise(data$))

  return (
    <div style={{padding: 12, border: '1px solid #ccc', borderRadius: 8}}>
      <strong>{data.tab}</strong>
      <p>{data.body}</p>
    </div>
  )
}

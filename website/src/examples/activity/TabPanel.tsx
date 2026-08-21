import {use} from 'react'
import {type ObservablePromise} from 'react-rx'

export default function TabPanel({
  promise,
}: {
  promise: ObservablePromise<{
    tab: string
    body: string
  }>
}) {
  const data = use(promise)

  return (
    <div
      style={{
        padding: 12,
        border: '1px solid #ccc',
        borderRadius: 8,
      }}
    >
      <strong>{data.tab}</strong>
      <p>{data.body}</p>
    </div>
  )
}

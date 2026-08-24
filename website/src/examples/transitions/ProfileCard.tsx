import {use} from 'react'
import {type ObservablePromise} from 'react-rx'

import {type Profile} from './api'

export default function ProfileCard({
  promise,
}: {
  promise: ObservablePromise<Profile>
}) {
  const profile = use(promise)

  return (
    <div
      style={{
        padding: 12,
        border: '1px solid #ccc',
        borderRadius: 8,
      }}
    >
      <strong>{profile.name}</strong>
      <p>{profile.bio}</p>
    </div>
  )
}

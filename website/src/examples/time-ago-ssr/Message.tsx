import {useMemo} from 'react'
import {useObservable} from 'react-rx'

import {
  timeAgoParts$,
  toTimeAgoParts,
} from './timeAgo'

const rtf = new Intl.RelativeTimeFormat('en', {
  numeric: 'auto',
})

export interface Payload {
  text: string
  sentAt: number
  /** The server's clock at render time, serialized alongside the HTML. */
  serverNow: number
}

export function Message({
  text,
  sentAt,
  serverNow,
}: Payload) {
  const parts$ = useMemo(
    () => timeAgoParts$(sentAt),
    [sentAt],
  )
  // The initial value derives from the *server's* clock, so the server markup
  // and the client's hydration render are byte-for-byte identical. No
  // Date.now() disagreement, no hydration mismatch. The live clock takes over
  // right after hydration. Memoized because the initial value is read on
  // every snapshot check until the first emission, so it must stay
  // referentially stable.
  const initialParts = useMemo(
    () => toTimeAgoParts(serverNow - sentAt),
    [serverNow, sentAt],
  )
  const parts = useObservable(
    parts$,
    initialParts,
  )

  return (
    <article>
      <p>{text}</p>
      <small>
        {rtf.format(parts.value, parts.unit)}
      </small>
    </article>
  )
}

import {useSyncObservable} from 'react-rx'
import {BehaviorSubject} from 'rxjs'

// A module-scoped BehaviorSubject: it holds a current value, emits it
// synchronously to new subscribers, and — living outside the component —
// keeps its state across remounts and can be shared or composed anywhere.
const liked$ = new BehaviorSubject(true)

export default function App() {
  // The synchronous emission means the first render already has the real
  // value — the initialValue argument is only a fallback for TypeScript here.
  const liked = useSyncObservable(liked$, true)

  return (
    <>
      <label>
        <input
          type="checkbox"
          checked={liked}
          onChange={(e) =>
            liked$.next(e.currentTarget.checked)
          }
        />
        I liked this
      </label>
      <p>
        You {liked ? 'liked' : 'did not like'}{' '}
        this.
      </p>
    </>
  )
}

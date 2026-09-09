import {useSyncObservable} from 'react-rx'
import {BehaviorSubject} from 'rxjs'

// A module-scoped BehaviorSubject: it holds a current value, emits it
// synchronously to new subscribers. Living outside the component, it
// keeps state across remounts and can be shared or composed anywhere.
const liked$ = new BehaviorSubject(true)

export default function App() {
  // initialValue renders first, then the subject's current value arrives
  // on commit. Seeding both with the same value keeps the paint stable.
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

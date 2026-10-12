import {useMemo} from 'react'
import {
  useObservableSubject,
  useSyncObservable,
} from 'react-rx'
import {scan, startWith} from 'rxjs'

interface FormState {
  first: string
  last: string
  subscribe: boolean
}

type FormChange =
  | {field: 'first' | 'last'; value: string}
  | {field: 'subscribe'; value: boolean}

const initialState: FormState = {
  first: '',
  last: '',
  subscribe: false,
}

export default function App() {
  // One stable subject for every field change; the handler never changes identity.
  const [changes$, handleChange] =
    useObservableSubject<FormChange>()

  // scan folds each change into a single form-state value — one source of truth.
  const state$ = useMemo(
    () =>
      changes$.pipe(
        scan(
          (state, change): FormState => ({
            ...state,
            [change.field]: change.value,
          }),
          initialState,
        ),
        startWith(initialState),
      ),
    [changes$],
  )

  // Controlled inputs read synchronously so typing never drops a keystroke.
  const state = useSyncObservable(
    state$,
    initialState,
  )
  const fullName =
    `${state.first} ${state.last}`.trim()

  return (
    <main>
      <form>
        <p>
          <label>
            First name{' '}
            <input
              value={state.first}
              onChange={(event) =>
                handleChange({
                  field: 'first',
                  value:
                    event.currentTarget.value,
                })
              }
            />
          </label>
        </p>
        <p>
          <label>
            Last name{' '}
            <input
              value={state.last}
              onChange={(event) =>
                handleChange({
                  field: 'last',
                  value:
                    event.currentTarget.value,
                })
              }
            />
          </label>
        </p>
        <p>
          <label>
            <input
              type="checkbox"
              checked={state.subscribe}
              onChange={(event) =>
                handleChange({
                  field: 'subscribe',
                  value:
                    event.currentTarget.checked,
                })
              }
            />{' '}
            Subscribe to the newsletter
          </label>
        </p>
      </form>
      <p>
        Hello, {fullName || 'stranger'}!{' '}
        {state.subscribe
          ? 'You are subscribed.'
          : 'You are not subscribed.'}
      </p>
    </main>
  )
}

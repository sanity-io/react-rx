import {
  useObservableSubject,
  useSyncObservable,
} from 'react-rx'

export default function Checkbox() {
  const [checked$, setChecked] =
    useObservableSubject<boolean>()
  const checked = useSyncObservable(
    checked$,
    false,
  )

  return (
    <fieldset>
      <legend>2. A checkbox</legend>
      <label>
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) =>
            setChecked(
              event.currentTarget.checked,
            )
          }
        />{' '}
        Send me updates
      </label>
      <p>
        {checked
          ? 'You are subscribed.'
          : 'You are not subscribed.'}
      </p>
    </fieldset>
  )
}

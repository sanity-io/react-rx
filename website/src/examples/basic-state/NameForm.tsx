import {useMemo} from 'react'
import {
  useObservableSubject,
  useSyncObservable,
} from 'react-rx'
import {scan} from 'rxjs'

interface Name {
  first: string
  last: string
}

const initialName: Name = {first: '', last: ''}

export default function NameForm() {
  const [changes$, updateName] =
    useObservableSubject<Partial<Name>>()
  const name$ = useMemo(
    () =>
      changes$.pipe(
        scan(
          (name, change) => ({
            ...name,
            ...change,
          }),
          initialName,
        ),
      ),
    [changes$],
  )
  const name = useSyncObservable(
    name$,
    initialName,
  )
  const fullName =
    `${name.first} ${name.last}`.trim()

  return (
    <fieldset>
      <legend>
        3. Two fields, one form value
      </legend>
      <label>
        First name
        <input
          value={name.first}
          onChange={(event) =>
            updateName({
              first: event.currentTarget.value,
            })
          }
        />
      </label>
      <label>
        Last name
        <input
          value={name.last}
          onChange={(event) =>
            updateName({
              last: event.currentTarget.value,
            })
          }
        />
      </label>
      <p>
        Full name: {fullName || 'Not entered yet'}
      </p>
    </fieldset>
  )
}

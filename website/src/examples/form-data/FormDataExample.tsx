import {
  type ChangeEvent,
  type SyntheticEvent,
  useState,
} from 'react'
import {
  useObservable,
  useSyncObservable,
} from 'react-rx'
import {
  map,
  scan,
  startWith,
  Subject,
  switchMap,
  withLatestFrom,
} from 'rxjs'

import storage from './storage'

const STORAGE_KEY = '__form-submit-example__'

interface FormValues {
  title: string
  description: string
}

// Form events push into Subjects
const formData$ = new Subject<
  Partial<FormValues>
>()
const submit$ = new Subject<void>()

function FormDataExample() {
  // Form data stream: start from what's in storage, then fold in every edit
  const [data$] = useState(() =>
    storage
      .get(STORAGE_KEY, {
        title: '',
        description: '',
      })
      .pipe(
        switchMap((initial) =>
          formData$.pipe(
            scan(
              (data, update) => ({
                ...data,
                ...update,
              }),
              initial,
            ),
            startWith(initial),
          ),
        ),
      ),
  )

  // Submit state stream: every submit samples the latest form data and
  // switches to the (async) storage write, emitting saving → saved
  const [submitState$] = useState(() =>
    submit$.pipe(
      withLatestFrom(data$),
      map(([, formData]) => formData),
      switchMap((formData) =>
        storage.set(STORAGE_KEY, formData).pipe(
          map(() => ({status: 'saved' as const})),
          startWith({status: 'saving' as const}),
        ),
      ),
      startWith({status: 'unsaved' as const}),
    ),
  )

  // Form field values feed controlled inputs, so they must stay synchronous.
  const formData = useSyncObservable(data$, {
    title: '',
    description: '',
  })
  const submitState = useObservable(
    submitState$,
    {status: 'unsaved' as const},
  )

  const handleChange = (
    e: ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement
    >,
  ) =>
    formData$.next({
      [e.currentTarget.name]:
        e.currentTarget.value,
    })

  const handleSubmit = (
    e: SyntheticEvent<HTMLFormElement>,
  ) => {
    e.preventDefault()
    submit$.next()
  }

  return (
    <form onSubmit={handleSubmit}>
      <label>
        Title
        <input
          type="text"
          name="title"
          value={formData.title}
          onChange={handleChange}
        />
      </label>
      <label>
        Description
        <textarea
          name="description"
          value={formData.description}
          onChange={handleChange}
        />
      </label>
      <button
        disabled={submitState.status === 'saving'}
      >
        {submitState.status === 'saving'
          ? 'Saving…'
          : submitState.status === 'saved'
            ? 'Saved!'
            : 'Save'}
      </button>
    </form>
  )
}

export default FormDataExample

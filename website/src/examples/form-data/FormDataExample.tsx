import {
  ChangeEvent,
  FormEvent,
  useState,
} from 'react'
import {
  useObservable,
  useObservableEvent,
} from 'react-rx'
import {type Observable, Subject} from 'rxjs'
import {
  map,
  scan,
  startWith,
  switchMap,
  tap,
  withLatestFrom,
} from 'rxjs/operators'
import {styled} from 'styled-components'

import storage from './storage'

const STORAGE_KEY = '__form-submit-example__'

// Create subjects for form events
const formData$ = new Subject<Partial<FormValues>>()
const submit$ = new Subject<
  FormEvent<HTMLFormElement>
>()

interface FormValues {
  title: string
  description: string
}

function FormDataExample() {
  // Handle input changes
  const handleChange = useObservableEvent<
    ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement
    >,
    any
  >((change$) =>
    change$.pipe(
      map((event) => ({
        [event.target.name]: event.target.value,
      })),
      tap((update) => formData$.next(update)),
    ),
  )

  // Handle form submissions
  const handleSubmit = useObservableEvent<
    FormEvent<HTMLFormElement>,
    any
  >((event$) =>
    event$.pipe(
      tap((e) => {
        e.preventDefault()
        submit$.next(e)
      }),
    ),
  )

  // Create form data stream
  const [data$] = useState(() =>
    storage
      .get(STORAGE_KEY, {
        title: '',
        description: '',
      })
      .pipe(
        switchMap((initial) =>
          formData$.pipe(
            startWith(initial),
            scan(
              (data, update) => ({
                ...data,
                ...update,
              }),
              initial,
            ),
          ),
        ),
      ),
  )

  // Create submit state stream
  const [submitState$] = useState(() =>
    submit$.pipe(
      withLatestFrom(data$),
      map(([, formData]) => formData),
      map((formData) =>
        storage.set(STORAGE_KEY, formData).pipe(
          map(() => ({
            status: 'saved' as const,
            result: formData,
          })),
          startWith({
            status: 'saving' as const,
            result: null,
          }),
        ),
      ),
      startWith({
        status: 'unsaved' as const,
        result: null,
      }),
    ),
  )

  const formData = useObservable(data$, {
    title: '',
    description: '',
  })
  const submitState = useObservable(
    // @TODO investigate why this is necessary
    submitState$ as unknown as Observable<{
      status: 'saved' | 'saving' | 'unsaved'
      result: FormValues | null
    }>,
    {
      status: 'unsaved' as const,
      result: null,
    },
  )

  return (
    <Form onSubmit={handleSubmit}>
      <div>
        <label>
          <strong>Title: </strong>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
          />
        </label>
      </div>
      <div>
        <label>
          <strong>Description: </strong>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
          />
        </label>
      </div>
      <div>
        <button
          disabled={
            submitState.status === 'saving'
          }
        >
          {submitState.status === 'saving'
            ? 'Saving…'
            : submitState.status === 'saved'
              ? 'Saved!'
              : 'Save'}
        </button>
      </div>
    </Form>
  )
}

const Form = styled.form`
  label {
    display: block;
    margin-top: 10px;
  }
  input,
  textarea {
    box-sizing: border-box;
    width: 100%;
    padding: 5px;
  }
`

export default FormDataExample

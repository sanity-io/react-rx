import {
  timer,
  concatMap,
  reactiveComponent,
  useEvent,
  concat,
  map,
  tap,
  withLatestFrom,
  startWith,
  merge,
  scan,
  React,
  ReactDOM
} from 'examples/_utils/globalScope'

import storage from './storage'
//@endimport

const STORAGE_KEY = '__form-submit-example__'

const save = formData =>
  timer(100 + Math.round(Math.random() * 1000)).pipe(
    concatMap(() => storage.set(STORAGE_KEY, formData))
  )

const INITIAL_PROPS = {
  submitState: {status: 'unsaved', result: null},
  formData: {}
}

const INITIAL_SUBMIT_STATE = {status: 'saving', result: null}

const FormDataExample = reactiveComponent(() => {
  const [onChange$, onChange] = useEvent()
  const [onSubmit$, onSubmit] = useEvent()

  const formData$ = concat(
    storage.get(STORAGE_KEY, {title: '', description: ''}),
    onChange$.pipe(
      map(event => event.target),
      map(target => ({
        [target.name]: target.value
      }))
    )
  ).pipe(scan((formData, update) => ({...formData, ...update}), {}))

  const submitState$ = onSubmit$.pipe(
    tap(event => event.preventDefault()),
    withLatestFrom(formData$),
    map(([event, formData]) => formData),
    concatMap(formData =>
      save(formData).pipe(
        map(res => ({status: 'saved', result: res})),
        startWith(INITIAL_SUBMIT_STATE)
      )
    )
  )

  return merge(
    formData$.pipe(map(formData => ({formData}))),
    submitState$.pipe(map(submitState => ({submitState})))
  ).pipe(
    scan((prev, curr) => ({...prev, ...curr}), INITIAL_PROPS),
    map(props => (
      <form onSubmit={onSubmit}>
        <div>
          <label>
            <strong>Title: </strong>
            <input
              type="text"
              name="title"
              value={props.formData.title}
              onChange={onChange}
            />
          </label>
        </div>
        <div>
          <label>
            <strong>Description: </strong>
            <textarea
              name="description"
              value={props.formData.description}
              onChange={onChange}
            />
          </label>
        </div>
        <div>
          <button disabled={props.submitState.status === 'saving'}>
            {props.submitState.status === 'saving'
              ? 'Saving…'
              : props.submitState.status === 'saved'
              ? 'Saved!'
              : 'Save'}
          </button>
        </div>
      </form>
    ))
  )
})

ReactDOM.render(
  <FormDataExample />,
  document.getElementById('formdata-example')
)

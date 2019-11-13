import * as React from 'react'
import {concat, merge, Observable, timer} from 'rxjs'
import {concatMap, map, scan, startWith, tap, withLatestFrom} from 'rxjs/operators'
import {reactiveComponent, useEvent} from '../../../src/reactiveComponent'
import storage from './storage'

const STORAGE_KEY = '__form-submit-example__'

const save = (data: FormData) =>
  timer(100 + Math.round(Math.random() * 1000)).pipe(
    concatMap(() => storage.set(STORAGE_KEY, data)),
  )

interface FormData {
  title?: string
  description?: string
}

interface SubmitState {
  status: 'unsaved' | 'saved' | 'saving'
  result: null | FormData
}

interface Props {
  submitState: SubmitState
  formData: Partial<FormData>
}

const INITIAL: Props = {
  submitState: {status: 'unsaved', result: null},
  formData: {},
}

const INITIAL_SUBMIT_STATE: SubmitState = {status: 'saving', result: null}

export const FormDataExample = reactiveComponent(() => {
  const [onChange$, onChange] = useEvent<
    React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  >()

  const [onSubmit$, onSubmit] = useEvent<React.SyntheticEvent>()

  const formData$: Observable<FormData> = concat(
    storage.get(STORAGE_KEY, {title: '', description: ''}),
    onChange$.pipe(
      map(event => event.target),
      map(target => ({
        [target.name]: target.value,
      })),
    ),
  ).pipe(scan((formData, update) => ({...formData, ...update}), {}))

  const submitState$ = onSubmit$.pipe(
    tap(event => event.preventDefault()),
    withLatestFrom(formData$),
    map(([event, formData]) => formData),
    concatMap(
      (formData: FormData): Observable<SubmitState> =>
        save(formData).pipe(
          map((res: FormData): SubmitState => ({status: 'saved', result: res})),
          startWith(INITIAL_SUBMIT_STATE),
        ),
    ),
  )

  return merge(
    formData$.pipe(map((formData): Partial<Props> => ({formData}))),
    submitState$.pipe(map((submitState: SubmitState): Partial<Props> => ({submitState}))),
  ).pipe(
    scan<Props>((prev, curr) => ({...prev, ...curr}), INITIAL),
    map((props: Props) => (
      <form onSubmit={onSubmit}>
        <div>
          <label>
            <strong>Title: </strong>
            <input type="text" name="title" value={props.formData.title} onChange={onChange} />
          </label>
        </div>
        <div>
          <label>
            <strong>Description: </strong>
            <textarea name="description" value={props.formData.description} onChange={onChange} />
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
    )),
  )
})

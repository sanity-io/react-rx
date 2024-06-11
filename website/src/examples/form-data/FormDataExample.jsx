import * as React from 'react'
import * as ReactDOM from 'react-dom'
import * as RxJS from 'rxjs'
import * as operators from 'rxjs/operators'

const {of, from, concat, merge} = RxJS
const {
  timer,
  interval,
  throwError,
  combineLatest,
  Observable,
} = RxJS

const {map, filter, reduce, scan, tap} = operators
const {concatMap, mergeMap, switchMap, mapTo} =
  operators
const {startWith, catchError, take} = operators
//@endimport

import {observableCallback} from 'observable-callback'
import {
  context,
  elementRef,
  forwardRef,
  handler,
  rxComponent,
  state,
  useAsObservable,
  useMemoObservable,
  useObservable,
} from 'react-rx-old'
import styled from 'styled-components'

import storage from './storage'
//@endimport

const {withLatestFrom} = operators

const STORAGE_KEY = '__form-submit-example__'

const save = (formData) =>
  timer(
    100 + Math.round(Math.random() * 1000),
  ).pipe(
    concatMap(() =>
      storage.set(STORAGE_KEY, formData),
    ),
  )

const INITIAL_PROPS = {
  submitState: {
    status: 'unsaved',
    result: null,
  },
  formData: {},
}

const INITIAL_SUBMIT_STATE = {
  status: 'saving',
  result: null,
}

const FormDataExample = rxComponent(() => {
  const [onChange$, onChange] = handler()
  const [onSubmit$, onSubmit] = handler()

  const formData$ = concat(
    storage.get(STORAGE_KEY, {
      title: '',
      description: '',
    }),
    onChange$.pipe(
      map((event) => event.target),
      map((target) => ({
        [target.name]: target.value,
      })),
    ),
  ).pipe(
    scan(
      (formData, update) => ({
        ...formData,
        ...update,
      }),
      {},
    ),
  )

  const submitState$ = onSubmit$.pipe(
    tap((event) => event.preventDefault()),
    withLatestFrom(formData$),
    map(([event, formData]) => formData),
    concatMap((formData) =>
      save(formData).pipe(
        map((res) => ({
          status: 'saved',
          result: res,
        })),
        startWith(INITIAL_SUBMIT_STATE),
      ),
    ),
  )

  return merge(
    formData$.pipe(
      map((formData) => ({
        formData,
      })),
    ),
    submitState$.pipe(
      map((submitState) => ({
        submitState,
      })),
    ),
  ).pipe(
    scan(
      (prev, curr) => ({
        ...prev,
        ...curr,
      }),
      INITIAL_PROPS,
    ),
    map((props) => (
      <Form onSubmit={onSubmit}>
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
          <button
            disabled={
              props.submitState.status ===
              'saving'
            }
          >
            {props.submitState.status === 'saving'
              ? 'Saving…'
              : props.submitState.status ===
                  'saved'
                ? 'Saved!'
                : 'Save'}
          </button>
        </div>
      </Form>
    )),
  )
})

ReactDOM.render(
  <FormDataExample />,
  document.getElementById('formdata-example'),
)

const Form = styled.form`
  label {
    display: block;
    margin-top: 10px;
  }
  input,
  textarea {
    width: 100%;
    padding: 5px;
  }
`

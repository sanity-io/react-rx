import {act, renderHook} from '@testing-library/react-hooks'
import {useObservable} from '../useObservable'
import {asyncScheduler, Observable, of, scheduled, Subject} from 'rxjs'

test('should subscribe immediately and unsubscribe on component unmount', () => {
  let subscribed = false
  const observable = new Observable(() => {
    subscribed = true
    return () => {
      subscribed = false
    }
  })

  expect(subscribed).toBe(false)

  const {unmount} = renderHook(() => useObservable(observable))
  expect(subscribed).toBe(true)

  unmount()
  expect(subscribed).toBe(false)
})

test('should have sync values from an observable as initial value', () => {
  const {result} = renderHook(() => useObservable(of('something sync')))
  expect(result.current).toBe('something sync')
})

test('should have undefined as initial value from async observables', () => {
  const {result, unmount} = renderHook(() =>
    useObservable(scheduled('something async', asyncScheduler)),
  )
  expect(result.current).toBeUndefined()
  unmount()
})

test('should have passed initialValue as initial value from async observables', () => {
  const {result, unmount} = renderHook(() =>
    useObservable(scheduled('something async', asyncScheduler), 'initial'),
  )
  expect(result.current).toBe('initial')
  unmount()
})

test('should update with values from observables', () => {
  const values$ = new Subject<string>()
  const {result, unmount} = renderHook(() => useObservable(values$))

  expect(result.current).toBe(undefined)

  act(() => values$.next('something'))
  expect(result.current).toBe('something')

  act(() => values$.next('otherthing'))
  expect(result.current).toBe('otherthing')
  unmount()
})

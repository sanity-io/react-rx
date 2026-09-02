/* oxlint-disable typescript/no-deprecated -- exercises the v6 surface that v7 removes */
import {renderHook} from '@testing-library/react'
import {Observable} from 'rxjs'
import {expect, test} from 'vitest'

import {useObservable} from '../useObservable'
import {useSyncObservable} from '../useSyncObservable'

test('useObservable and useSyncObservable share one source subscription for the same observable', async () => {
  let subscribeCount = 0
  const observable = new Observable<number>((subscriber) => {
    subscriber.next(subscribeCount++)
  })

  const deferred = renderHook(() => useObservable(observable))
  expect(deferred.result.current).toBe(0)

  const sync = renderHook(() => useSyncObservable(observable))
  expect(sync.result.current).toBe(0)
  expect(subscribeCount).toBe(1)

  deferred.unmount()
  sync.unmount()
  await Promise.resolve()

  const remount = renderHook(() => useObservable(observable))
  expect(remount.result.current).toBe(1)
  remount.unmount()
})

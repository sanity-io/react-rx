import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import {lessons$, revalidate} from './index'

beforeEach(() => {
  // The cache releases keys with timers, and nothing here subscribes a request.
  vi.useFakeTimers()
  revalidate()
})

afterEach(() => {
  vi.useRealTimers()
})

it('shares one observable per tab and search, so every consumer joins one request', () => {
  expect(lessons$('all', '', 0)).toBe(lessons$('all', '', 0))
  expect(lessons$('all', '', 0)).not.toBe(lessons$('complete', '', 0))
  expect(lessons$('all', '', 0)).not.toBe(lessons$('all', 'hooks', 0))
})

it('keeps the observable across revisions, since a refresh revalidates instead', () => {
  expect(lessons$('all', '', 1)).toBe(lessons$('all', '', 2))
})

it('refetches after revalidate(), which is what router.refresh() relies on', () => {
  const before = lessons$('all', '', 0)
  revalidate()
  expect(lessons$('all', '', 0)).not.toBe(before)
  expect(lessons$('all', '', 0)).toBe(lessons$('all', '', 0))
})

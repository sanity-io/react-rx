import {act, render, screen} from '@testing-library/react'
import {Suspense, use, useMemo, type ReactNode} from 'react'
import {concat, defer, map, type Observable, throwError, timer} from 'rxjs'
import {expect, test} from 'vitest'

import {createObservableCache} from '../createObservableCache'
import {DEFAULT_HOOK_TTL} from '../index'
import {useObservablePromise} from '../useObservablePromise'

const TTL = 5000
const LATENCY = 20

type GetUser = (id: string) => Observable<string>

/** Counts requests on subscribe, which is when the source actually runs. */
function trackedFetch() {
  let requests = 0
  const fetchUser: GetUser = (id) =>
    defer(() => {
      requests++
      return timer(LATENCY)
    }).pipe(map(() => `${id} loaded`))
  return {fetchUser, requests: () => requests}
}

/**
 * Suspense recovery requires the initial render to be inside an awaited `act`.
 * Otherwise React never attaches the wakeable ping and the boundary stays stuck.
 */
async function renderAsync(ui: ReactNode) {
  let result!: ReturnType<typeof render>
  await act(async () => {
    result = render(ui)
  })
  return result
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function Fallback({onRender}: {onRender: () => void}) {
  onRender()
  return <div data-testid="fallback">loading</div>
}

function Name({promise}: {promise: Promise<string>}) {
  return <div data-testid="name">{use(promise)}</div>
}

/**
 * The same component against both data layers: `getUser` is either a cache lookup, giving every
 * consumer of an id one observable, or the request itself, giving each consumer its own.
 */
function Profile({
  getUser,
  id,
  onFallback,
}: {
  getUser: GetUser
  id: string
  onFallback: () => void
}) {
  const user$ = useMemo(() => getUser(id), [getUser, id])
  const promise = useObservablePromise(user$, {ttl: TTL})
  return (
    <Suspense fallback={<Fallback onRender={onFallback} />}>
      <Name promise={promise} />
    </Suspense>
  )
}

test('a remount after load renders without suspending, and makes no second request', async () => {
  const {fetchUser, requests} = trackedFetch()
  const users = createObservableCache(fetchUser, {ttl: TTL})
  let fallbacks = 0
  const onFallback = () => {
    fallbacks++
  }

  const mounted = await renderAsync(<Profile getUser={users} id="a" onFallback={onFallback} />)
  expect(fallbacks).toBeGreaterThanOrEqual(1)
  await act(async () => {
    await wait(LATENCY * 2)
  })
  expect(screen.getByTestId('name').textContent).toBe('a loaded')

  mounted.unmount()
  // Past the hook's default retention, so only the `ttl` the hook was given can keep the promise
  await wait(DEFAULT_HOOK_TTL + 100)
  fallbacks = 0

  await renderAsync(<Profile getUser={users} id="a" onFallback={onFallback} />)

  expect(screen.getByTestId('name').textContent).toBe('a loaded')
  expect(screen.queryByTestId('fallback')).toBeNull()
  expect(fallbacks).toBe(0)
  expect(requests()).toBe(1)
})

test('without the cache, that remount suspends again and refetches', async () => {
  const {fetchUser, requests} = trackedFetch()
  let fallbacks = 0
  const onFallback = () => {
    fallbacks++
  }

  const mounted = await renderAsync(<Profile getUser={fetchUser} id="a" onFallback={onFallback} />)
  await act(async () => {
    await wait(LATENCY * 2)
  })
  expect(screen.getByTestId('name').textContent).toBe('a loaded')

  mounted.unmount()
  await wait(DEFAULT_HOOK_TTL + 100)
  fallbacks = 0

  await renderAsync(<Profile getUser={fetchUser} id="a" onFallback={onFallback} />)

  expect(fallbacks).toBeGreaterThanOrEqual(1)
  expect(requests()).toBe(2)
})

/**
 * The cache's `ttl` and the hook's nest rather than coincide: the hook holds the cached observable
 * for its own `ttl` after the last consumer unmounts, and the cache's only starts once it lets go.
 * Deliberately asymmetric ttls here, so each boundary is unambiguous.
 */
test('a remount past the hook ttl but inside the cache ttl suspends without refetching', async () => {
  const hookTtl = 100
  const cacheTtl = 1000
  const {fetchUser, requests} = trackedFetch()
  const users = createObservableCache(fetchUser, {ttl: cacheTtl})
  let fallbacks = 0
  const onFallback = () => {
    fallbacks++
  }

  function ShortLivedProfile() {
    const user$ = users('a')
    const promise = useObservablePromise(user$, {ttl: hookTtl})
    return (
      <Suspense fallback={<Fallback onRender={onFallback} />}>
        <Name promise={promise} />
      </Suspense>
    )
  }

  const mounted = await renderAsync(<ShortLivedProfile />)
  await act(async () => {
    await wait(LATENCY * 2)
  })
  expect(screen.getByTestId('name').textContent).toBe('a loaded')
  mounted.unmount()

  // Past the hook's retention, so its settled promise is gone, but well inside the cache's
  await wait(400)
  fallbacks = 0

  await renderAsync(<ShortLivedProfile />)

  expect(fallbacks).toBeGreaterThanOrEqual(1)
  expect(requests()).toBe(1)
  await act(async () => {
    await wait(LATENCY * 2)
  })
  expect(screen.getByTestId('name').textContent).toBe('a loaded')
  expect(requests()).toBe(1)
})

/**
 * A request that fails after its result settles the hook's entry and then errors it, which swaps in
 * a rejected promise and re-renders the consumer. Releasing the key on that error would make the
 * re-render miss the cache and fetch again, with no end to it.
 */
test('a request that fails after its result does not refetch on every re-render', async () => {
  let requests = 0
  const users = createObservableCache(
    (id: string) =>
      defer(() => {
        requests++
        return concat(
          timer(LATENCY).pipe(map(() => `${id} loaded`)),
          throwError(() => new Error('the stream dropped')),
        )
      }),
    {ttl: TTL},
  )

  function Profile() {
    const promise = useObservablePromise(users('a'), {ttl: TTL})
    return (
      <Suspense fallback={<Fallback onRender={() => {}} />}>
        <Name promise={promise} />
      </Suspense>
    )
  }

  await renderAsync(<Profile />)
  await act(async () => {
    await wait(LATENCY * 2)
  })
  const afterSettle = requests

  await act(async () => {
    await wait(500)
  })

  expect(afterSettle).toBe(1)
  expect(requests).toBe(1)
})

test('a second consumer mounted after the load renders without suspending', async () => {
  const {fetchUser, requests} = trackedFetch()
  const users = createObservableCache(fetchUser, {ttl: TTL})
  let fallbacks = 0
  const onFallback = () => {
    fallbacks++
  }

  const {rerender} = await renderAsync(
    <>
      <Profile getUser={users} id="a" onFallback={onFallback} />
    </>,
  )
  await act(async () => {
    await wait(LATENCY * 2)
  })
  expect(screen.getByTestId('name').textContent).toBe('a loaded')
  fallbacks = 0

  await act(async () => {
    rerender(
      <>
        <Profile getUser={users} id="a" onFallback={onFallback} />
        <Profile getUser={users} id="a" onFallback={onFallback} />
      </>,
    )
  })

  expect(screen.getAllByTestId('name')).toHaveLength(2)
  expect(fallbacks).toBe(0)
  expect(requests()).toBe(1)
})

import {act, render, renderHook} from '@testing-library/react'
import {useCallback, useMemo} from 'react'
import {hydrateRoot} from 'react-dom/client'
import {renderToString} from 'react-dom/server'
import {BehaviorSubject, Observable, Subject} from 'rxjs'
import {describe, expect, test, vi} from 'vitest'

import {useObservable} from '../useObservable'
import {useSyncObservable} from '../useSyncObservable'

// Render counters have to move during render; that movement is what the loop tests measure.
/* oxlint-disable react/globals */

/**
 * Prototype contract: `initialValue` is resolved again when the observable identity changes,
 * and kept (including its reference) while that identity is stable.
 *
 * A churning observable loops only when its subscription synchronously replays a value that
 * is not `Object.is` to the initial value resolved for that identity. The loop cases stop
 * changing identity after 25 renders so React does not abort the renderer. A run that climbs
 * past 20 renders was looping; a run that stays under 10 was not.
 */
const hooks = [
  {name: 'useObservable', useHook: useObservable},
  {name: 'useSyncObservable', useHook: useSyncObservable},
] as const

describe.each(hooks)(
  '$name re-reads initialValue when the observable identity changes',
  ({useHook}) => {
    test('an identity change before any emission renders the new initial value, not the one captured at mount', () => {
      const first$ = new Subject<string>()
      const second$ = new Subject<string>()
      const frames: string[] = []

      function Probe({id}: {id: 'first' | 'second'}) {
        const observable = id === 'first' ? first$ : second$
        frames.push(useHook(observable, id === 'first' ? 'init-first' : 'init-second'))
        return null
      }

      const {rerender} = render(<Probe id="first" />)
      expect(frames.at(-1)).toBe('init-first')

      const cut = frames.length
      rerender(<Probe id="second" />)

      expect(frames[cut]).toBe('init-second')
      expect(frames.slice(cut)).not.toContain('init-first')
      expect(frames.at(-1)).toBe('init-second')
    })

    test('a factory initial value runs once per observable identity and keeps one reference for that identity', () => {
      let calls = 0
      const frames: {id: string}[] = []

      function Probe({id}: {id: string}) {
        // Close over `id` so the React Compiler cannot drop it and reuse one subject.
        const observable = useMemo(
          () =>
            new Observable<{id: string}>((subscriber) => {
              if (id === '\0') subscriber.next({id})
            }),
          [id],
        )
        const value = useHook(observable, () => {
          calls += 1
          return {id}
        })
        frames.push(value)
        return null
      }

      const {rerender} = render(<Probe id="a" />)
      expect(calls).toBe(1)
      const first = frames[0]
      expect(first).toEqual({id: 'a'})

      rerender(<Probe id="a" />)
      expect(calls).toBe(1)
      expect(frames.every((frame) => frame === first)).toBe(true)

      const cut = frames.length
      rerender(<Probe id="b" />)
      expect(calls).toBe(2)
      expect(frames[cut]).toEqual({id: 'b'})
      expect(frames[cut]).not.toBe(first)
      expect(frames.slice(cut).every((frame) => frame === frames[cut])).toBe(true)
    })

    test('changing initialValue without changing the observable does not replace the resolved value', () => {
      const values$ = new Subject<string>()
      const {result, rerender} = renderHook(
        ({initial}: {initial: string}) => useHook(values$, initial),
        {
          initialProps: {initial: 'first'},
        },
      )

      expect(result.current).toBe('first')
      rerender({initial: 'second'})
      expect(result.current).toBe('first')
    })

    test('an emitted nullish value is not replaced by a later initialValue (unlike `value ?? fallback`)', () => {
      const values$ = new Subject<string | undefined>()
      const frames: Array<string | undefined> = []

      function Probe({initial}: {initial: string}) {
        frames.push(useHook(values$, initial))
        return null
      }

      const {rerender} = render(<Probe initial="fallback-a" />)
      expect(frames.at(-1)).toBe('fallback-a')

      act(() => values$.next(undefined))
      expect(frames.at(-1)).toBeUndefined()

      rerender(<Probe initial="fallback-b" />)
      expect(frames.at(-1)).toBeUndefined()
    })

    test('a synchronous emission replaces the new initial value after commit, so the painted value is the emission', () => {
      const frames: string[] = []

      function Probe({id}: {id: string}) {
        const observable = useMemo(() => new BehaviorSubject(`live-${id}`), [id])
        const value = useHook(observable, `init-${id}`)
        frames.push(value)
        return <span>{value}</span>
      }

      const {rerender, container} = render(<Probe id="a" />)
      expect(frames[0]).toBe('init-a')
      expect(container.textContent).toBe('live-a')

      const cut = frames.length
      rerender(<Probe id="b" />)
      expect(frames[cut]).toBe('init-b')
      expect(frames.slice(cut)).not.toContain('live-a')
      expect(frames.at(-1)).toBe('live-b')
      expect(container.textContent).toBe('live-b')
    })

    test('an observable that has already emitted elsewhere never shows the new initial value', () => {
      const shared = new BehaviorSubject('cached')
      const frames: string[] = []

      function Keeper() {
        useHook(shared, 'keeper-initial')
        return null
      }
      function Reader() {
        frames.push(useHook(shared, 'reader-initial'))
        return null
      }

      const {rerender} = render(<Keeper />)
      rerender(
        <>
          <Keeper />
          <Reader />
        </>,
      )

      expect(frames[0]).toBe('cached')
      expect(frames).not.toContain('reader-initial')
    })

    test('SSR and hydration render the factory initial value and do not subscribe', async () => {
      let subscriptions = 0
      const observable = new Observable<string>((subscriber) => {
        subscriptions += 1
        subscriber.next('sync')
      })

      function App() {
        return <div data-testid="value">{useHook(observable, () => 'from-factory')}</div>
      }

      const html = renderToString(<App />)
      expect(html).toContain('from-factory')
      expect(html).not.toContain('sync')
      expect(subscriptions).toBe(0)

      const container = document.createElement('div')
      container.innerHTML = html
      document.body.appendChild(container)
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
      let root: ReturnType<typeof hydrateRoot> | undefined
      await act(async () => {
        root = hydrateRoot(container, <App />)
      })

      const hydrationErrors = consoleError.mock.calls
        .map((args) => String(args[0]))
        .filter((message) => /hydrat|did not match|Text content does not match/i.test(message))
      expect(hydrationErrors).toEqual([])
      // The server markup matches the client's first paint. The commit-time subscription then
      // delivers the synchronous emission, which is the value on screen after hydration.
      expect(container.querySelector('[data-testid="value"]')?.textContent).toBe('sync')
      expect(subscriptions).toBe(1)

      await act(async () => {
        root?.unmount()
      })
      container.remove()
      consoleError.mockRestore()
    })

    test('Strict Mode keeps one mount reference, and an identity change resolves the factory again', () => {
      let calls = 0
      const frames: {id: string}[] = []

      function Probe({id}: {id: string}) {
        const observable = useMemo(
          () =>
            new Observable<{id: string}>((subscriber) => {
              if (id === '\0') subscriber.next({id})
            }),
          [id],
        )
        const value = useHook(observable, () => {
          calls += 1
          return {id}
        })
        frames.push(value)
        return null
      }

      const {rerender} = render(<Probe id="a" />, {reactStrictMode: true})
      const mountFrames = frames.filter((frame) => frame.id === 'a')
      expect(new Set(mountFrames).size).toBe(1)
      expect(calls).toBeGreaterThanOrEqual(1)
      expect(calls).toBeLessThan(5)
      const callsAfterMount = calls

      rerender(<Probe id="b" />)
      const nextFrames = frames.filter((frame) => frame.id === 'b')
      expect(nextFrames.length).toBeGreaterThan(0)
      expect(nextFrames.at(-1)).toEqual({id: 'b'})
      expect(calls).toBeGreaterThan(callsAfterMount)
      expect(calls).toBeLessThan(callsAfterMount + 6)
    })

    test('disabled identity change re-reads initialValue and still does not subscribe', () => {
      let subscriptions = 0
      const frames: string[] = []

      function Probe({id}: {id: string}) {
        const observable = useMemo(
          () =>
            new Observable<string>((subscriber) => {
              subscriptions += 1
              if (id === '\0') subscriber.next(id)
            }),
          [id],
        )
        frames.push(useHook(observable, `init-${id}`, {disabled: true}))
        return null
      }

      const {rerender} = render(<Probe id="a" />)
      rerender(<Probe id="b" />)

      expect(frames.at(-1)).toBe('init-b')
      expect(frames).toContain('init-a')
      expect(subscriptions).toBe(0)
    })

    test('a stable observable plus an unmemoized fresh-object factory does not loop', () => {
      let renders = 0
      let calls = 0
      const observable = new Subject<{n: number}>()

      function Probe() {
        renders += 1
        useHook(observable, () => {
          calls += 1
          return {n: renders}
        })
        return null
      }

      const {rerender} = render(<Probe />)
      rerender(<Probe />)
      rerender(<Probe />)

      expect(calls).toBe(1)
      expect(renders).toBeLessThan(10)
    })

    test('rebuilding the observable every render with a primitive initial value does not loop', () => {
      let renders = 0

      function Probe() {
        renders += 1
        const token = renders
        const observable = useMemo(
          () =>
            new Observable<string>((subscriber) => {
              if (token < 0) subscriber.next('loading')
            }),
          [token],
        )
        useHook(observable, 'loading')
        return null
      }

      const {rerender} = render(<Probe />)
      rerender(<Probe />)
      rerender(<Probe />)

      expect(renders).toBeLessThan(10)
    })

    test('rebuilding the observable every render with a fresh object does not loop when nothing emits synchronously', () => {
      let renders = 0

      function Probe() {
        renders += 1
        const token = renders
        const observable = useMemo(
          () =>
            new Observable<{token: number}>((subscriber) => {
              if (token < 0) subscriber.next({token})
            }),
          [token],
        )
        useHook(observable, () => ({token}))
        return null
      }

      const {rerender} = render(<Probe />)
      rerender(<Probe />)
      rerender(<Probe />)

      expect(renders).toBeLessThan(10)
    })

    test('a synchronous replay of the mount-time initial value loops once later identities resolve a different placeholder', () => {
      // v7 would settle: the replay matches the initial value captured at mount, and later
      // placeholders are ignored. Re-resolving makes the replay disagree with the new placeholder,
      // the notification re-renders, and the next render builds yet another identity.
      let renders = 0

      function Probe() {
        renders += 1
        const token = renders > 25 ? 25 : renders
        const observable = useMemo(
          () => new BehaviorSubject(token < 0 ? 'nope' : 'init-1'),
          [token],
        )
        const initial = token === 25 ? 'init-1' : `init-${token}`
        useHook(observable, initial)
        return null
      }

      const {rerender} = render(<Probe />)
      if (renders < 15) rerender(<Probe />)

      expect(renders).toBeGreaterThan(20)
      expect(renders).toBeLessThan(40)
    })

    test('useCallback around a factory does not prevent that replay loop', () => {
      let renders = 0

      function Probe() {
        renders += 1
        const token = renders > 25 ? 25 : renders
        const observable = useMemo(
          () => new BehaviorSubject(token < 0 ? 'nope' : 'init-1'),
          [token],
        )
        const factory = useCallback(() => (token === 25 ? 'init-1' : `init-${token}`), [token])
        useHook(observable, factory)
        return null
      }

      const {rerender} = render(<Probe />)
      if (renders < 15) rerender(<Probe />)

      expect(renders).toBeGreaterThan(20)
      expect(renders).toBeLessThan(40)
    })

    test('a placeholder that stays Object.is to the synchronous replay does not loop', () => {
      let renders = 0

      function Probe() {
        renders += 1
        const token = renders
        const observable = useMemo(
          () => new BehaviorSubject(token < 0 ? 'nope' : 'init-1'),
          [token],
        )
        useHook(observable, 'init-1')
        return null
      }

      const {rerender} = render(<Probe />)
      rerender(<Probe />)
      rerender(<Probe />)

      expect(renders).toBeLessThan(10)
    })

    test('an inline factory that returns a primitive equal to the replay does not loop', () => {
      let renders = 0
      let calls = 0

      function Probe() {
        renders += 1
        const token = renders
        const observable = useMemo(
          () => new BehaviorSubject(token < 0 ? 'nope' : 'loading'),
          [token],
        )
        useHook(observable, () => {
          calls += 1
          return 'loading'
        })
        return null
      }

      const {rerender} = render(<Probe />)
      rerender(<Probe />)
      rerender(<Probe />)

      expect(renders).toBeLessThan(10)
      expect(calls).toBeLessThan(10)
      expect(calls).toBeGreaterThan(0)
    })
  },
)

test('useSyncObservable server snapshot stays the resolved initial value when another subscriber has already emitted', () => {
  const shared = new BehaviorSubject('cached')
  renderHook(() => useSyncObservable(shared, 'client-initial'))

  function ServerView() {
    return <>{useSyncObservable(shared, 'server-initial')}</>
  }

  expect(renderToString(<ServerView />)).toBe('server-initial')
})

test('useObservable server snapshot uses the shared emission when the entry is already live in this runtime', () => {
  const shared = new BehaviorSubject('cached')
  renderHook(() => useObservable(shared, 'client-initial'))

  function ServerView() {
    return <>{useObservable(shared, 'server-initial')}</>
  }

  // `getServerSnapshot` goes through the shared store. A BehaviorSubject subscribed earlier in
  // this isolate has already filled the cache, so the server render shows that emission rather
  // than the initial value. `useSyncObservable` does not (covered above).
  expect(renderToString(<ServerView />)).toBe('cached')
})

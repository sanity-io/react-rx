/**
 * Regression suite for the stream shapes `sanity-io/sanity` feeds into `useObservable` /
 * `useSyncObservable`. Each scenario cites the sanity source it mirrors, so a failure
 * here maps directly to studio behavior.
 */
import {act, render} from '@testing-library/react'
import {useMemo} from 'react'
import {
  BehaviorSubject,
  distinctUntilChanged,
  EMPTY,
  map,
  NEVER,
  Observable,
  of,
  shareReplay,
  Subject,
  take,
} from 'rxjs'
import {expect, test} from 'vitest'

import {useObservable} from '../useObservable'
import {useSyncObservable} from '../useSyncObservable'

const tick = () => new Promise((resolve) => setTimeout(resolve, 0))

// ---------------------------------------------------------------------------
// Un-memoized observables recreated on every render
// (packages/sanity/src/core/studio/components/navbar/useCanInviteMembers.ts)
// ---------------------------------------------------------------------------

/**
 * Mirrors `useCanInviteMembers`: the observable is rebuilt on every render —
 * `enabled ? store.getGrants().pipe(map(...)) : of(false)` — with no `useMemo`. The
 * store observable replays synchronously (sanity's grants store is cached), which is
 * what keeps the pattern stable.
 */
function CanInvitePane({
  enabled,
  grants$,
  frames,
}: {
  enabled: boolean
  grants$: Observable<string[]>
  frames: boolean[]
}) {
  const result$ = grants$.pipe(map((grants) => grants.includes('invite')))
  const canInvite$ = enabled ? result$ : of(false)
  frames.push(useObservable(canInvite$, false))
  return null
}

test('a new observable identity on every render stays stable when the source replays synchronously', () => {
  let activeSubscriptions = 0
  const grantsSubject = new BehaviorSubject<string[]>(['invite'])
  const grants$ = new Observable<string[]>((subscriber) => {
    activeSubscriptions += 1
    const subscription = grantsSubject.subscribe(subscriber)
    return () => {
      activeSubscriptions -= 1
      subscription.unsubscribe()
    }
  })

  const frames: boolean[] = []
  const {rerender, unmount} = render(<CanInvitePane enabled grants$={grants$} frames={frames} />)

  // With an initialValue the hook's *initial* observable is not probed during render, so
  // the very first frame shows the initialValue (false); the commit-time subscription then
  // delivers the synchronous replay. Every *replacement* identity created by a re-render is
  // still warmed up during render — that is what lets this un-memoized pattern settle
  // instead of looping (render initialValue → commit subscribe emits → forced re-render →
  // fresh identity renders initialValue again → …).
  expect(frames[0]).toBe(false)
  expect(frames.at(-1)).toBe(true)
  expect(frames.length).toBeLessThan(10)
  rerender(<CanInvitePane enabled grants$={grants$} frames={frames} />)
  rerender(<CanInvitePane enabled grants$={grants$} frames={frames} />)
  expect(frames.at(-1)).toBe(true)

  // A store update flows through even though each render subscribes a new identity —
  // and it must not trigger a render loop (each update re-renders, which rebuilds the
  // observable, whose warm-up replays the same value and settles).
  const framesBeforeUpdate = frames.length
  act(() => grantsSubject.next([]))
  expect(frames.at(-1)).toBe(false)
  expect(frames.length - framesBeforeUpdate).toBeLessThan(10)

  unmount()
  return tick().then(() => {
    // Every per-render subscription was cleaned up.
    expect(activeSubscriptions).toBe(0)
  })
})

test('the disabled branch (`of(false)` rebuilt every render) never subscribes the store and stays false', () => {
  let storeSubscriptions = 0
  const grants$ = new Observable<string[]>(() => {
    storeSubscriptions += 1
  })

  const frames: boolean[] = []
  const {rerender} = render(<CanInvitePane enabled={false} grants$={grants$} frames={frames} />)
  rerender(<CanInvitePane enabled={false} grants$={grants$} frames={frames} />)

  expect(frames.every((frame) => !frame)).toBe(true)
  expect(storeSubscriptions).toBe(0)
})

/**
 * Mirrors the grants call site guarded by a closed menu: the piped observable is rebuilt on
 * every render (no `useMemo`) and the hook is `disabled` until the menu opens. Found while
 * testing the warm-up skip in sanity-io/sanity#14234: replacements were warmed on any
 * re-render, so a parent update fired the grants request during a render nobody needed.
 */
function ClosedMenuPane({label, grants$}: {label: string; grants$: Observable<string[]>}) {
  const canInvite$ = grants$.pipe(map((grants) => grants.includes('invite')))
  useObservable(canInvite$, false, {disabled: true})
  return <span>{label}</span>
}

test('identity churn while disabled: the store is never subscribed (grants stay un-fetched until the menu opens)', () => {
  // Before the hook has received an emission there is nothing a replacement warm-up could
  // stabilize (no live subscription means no store-driven re-renders, hence no loop), so
  // re-renders that rebuild the observable must not fire the grants request.
  let storeSubscriptions = 0
  const grants$ = new Observable<string[]>(() => {
    storeSubscriptions += 1
  })

  const {rerender} = render(<ClosedMenuPane label="a" grants$={grants$} />)
  rerender(<ClosedMenuPane label="b" grants$={grants$} />)
  rerender(<ClosedMenuPane label="c" grants$={grants$} />)

  expect(storeSubscriptions).toBe(0)
})

test('identity churn while disabled: Strict Mode double renders do not subscribe the store either', () => {
  let storeSubscriptions = 0
  const grants$ = new Observable<string[]>(() => {
    storeSubscriptions += 1
  })

  const {rerender} = render(<ClosedMenuPane label="a" grants$={grants$} />, {
    reactStrictMode: true,
  })
  rerender(<ClosedMenuPane label="b" grants$={grants$} />)

  expect(storeSubscriptions).toBe(0)
})

// ---------------------------------------------------------------------------
// EMPTY / NEVER singletons
// (packages/sanity/src/core/user-color/hooks.ts and
//  packages/sanity/src/core/form/utils/WithReferencedAsset.tsx)
// ---------------------------------------------------------------------------

function ObservableValueProbe({
  observable,
  initialValue,
  frames,
}: {
  observable: Observable<string>
  initialValue: string
  frames: string[]
}) {
  frames.push(useObservable(observable, initialValue))
  return null
}

test('the EMPTY singleton: every consumer keeps its own initialValue with no cross-contamination', async () => {
  // `useUserColor` does `useMemo(() => (userId ? manager.listen(userId) : EMPTY), ...)`
  // — EMPTY is a module-level singleton shared by every such hook in the app. It
  // completes synchronously, which evicts the cache entry right away; that eviction is
  // what keeps concurrent consumers with different initial values isolated.
  const framesA: string[] = []
  const framesB: string[] = []

  const a = render(
    <ObservableValueProbe observable={EMPTY} initialValue="color-a" frames={framesA} />,
  )
  const b = render(
    <ObservableValueProbe observable={EMPTY} initialValue="color-b" frames={framesB} />,
  )

  expect(framesA.every((frame) => frame === 'color-a')).toBe(true)
  expect(framesB.every((frame) => frame === 'color-b')).toBe(true)

  a.rerender(<ObservableValueProbe observable={EMPTY} initialValue="color-a" frames={framesA} />)
  expect(framesA.at(-1)).toBe('color-a')

  a.unmount()
  b.unmount()
  await tick()
})

test('the NEVER singleton: consumers see their own initialValue and unmounting one does not disturb another', async () => {
  // `WithReferencedAsset` swaps to NEVER when there is no document id. NEVER also is a
  // module-level singleton, and unlike EMPTY it never terminates, so all consumers
  // share one long-lived cache entry that must never emit anything.
  const framesA: string[] = []
  const framesB: string[] = []

  const a = render(
    <ObservableValueProbe observable={NEVER} initialValue="pending-a" frames={framesA} />,
  )
  const b = render(
    <ObservableValueProbe observable={NEVER} initialValue="pending-b" frames={framesB} />,
  )

  expect(framesA.every((frame) => frame === 'pending-a')).toBe(true)
  expect(framesB.every((frame) => frame === 'pending-b')).toBe(true)

  a.unmount()
  await tick()

  const framesBeforeRerender = framesB.length
  b.rerender(<ObservableValueProbe observable={NEVER} initialValue="pending-b" frames={framesB} />)
  expect(framesB.length).toBeGreaterThan(framesBeforeRerender)
  expect(framesB.every((frame) => frame === 'pending-b')).toBe(true)

  b.unmount()
  await tick()
})

// ---------------------------------------------------------------------------
// Completing sources: take(1) latching
// (edit-state low-priority path in sanity's document store)
// ---------------------------------------------------------------------------

function TakeOneProbe({source$, frames}: {source$: Observable<string>; frames: string[]}) {
  const observable = useMemo(() => source$.pipe(take(1)), [source$])
  frames.push(useObservable(observable, 'initial'))
  return null
}

test('a take(1) source latches the first emission and ignores everything after completion', () => {
  const subject = new Subject<string>()
  const frames: string[] = []
  const {rerender} = render(<TakeOneProbe source$={subject} frames={frames} />)

  expect(frames.at(-1)).toBe('initial')

  act(() => subject.next('first'))
  expect(frames.at(-1)).toBe('first')

  // The observable completed with take(1); later source emissions must not update the
  // mounted hook, and re-renders keep the latched value.
  act(() => subject.next('second'))
  expect(frames.at(-1)).toBe('first')

  rerender(<TakeOneProbe source$={subject} frames={frames} />)
  expect(frames.at(-1)).toBe('first')
})

// ---------------------------------------------------------------------------
// shareReplay({bufferSize: 1, refCount: true}) sources
// (packages/sanity/src/core/hooks/useEditState.ts and the teardown-timing contract in
//  packages/sanity/src/structure/structureResolvers/__tests__/useResolvedPanes.test.tsx)
// ---------------------------------------------------------------------------

function EditStateProbe({editState$, frames}: {editState$: Observable<string>; frames: string[]}) {
  // `useEditState` reads synchronously: stale edit state paired with live selection
  // would tear (see the deferral-safety section below).
  frames.push(useSyncObservable(editState$, undefined)!)
  return null
}

test('a shareReplay({refCount: true}) source: one subscription while mounted, teardown deferred by a tick after unmount', async () => {
  let activeSourceSubscriptions = 0
  const subject = new BehaviorSubject('edit-state-1')
  const source$ = new Observable<string>((subscriber) => {
    activeSourceSubscriptions += 1
    const subscription = subject.subscribe(subscriber)
    return () => {
      activeSourceSubscriptions -= 1
      subscription.unsubscribe()
    }
  })
  const editState$ = source$.pipe(
    distinctUntilChanged(),
    shareReplay({bufferSize: 1, refCount: true}),
  )

  const frames: string[] = []
  const {rerender, unmount} = render(<EditStateProbe editState$={editState$} frames={frames} />)

  expect(frames.at(-1)).toBe('edit-state-1')
  expect(activeSourceSubscriptions).toBe(1)

  // Re-renders reuse the store subscription — the source never sees churn.
  rerender(<EditStateProbe editState$={editState$} frames={frames} />)
  expect(activeSourceSubscriptions).toBe(1)

  act(() => subject.next('edit-state-2'))
  expect(frames.at(-1)).toBe('edit-state-2')

  // useResolvedPanes.test.tsx pins this: "react-rx shares the observable and resets on
  // refCount zero via asapScheduler, so source teardown is deferred by a tick".
  unmount()
  expect(activeSourceSubscriptions).toBe(1)
  await tick()
  expect(activeSourceSubscriptions).toBe(0)
})

test('remounting within the teardown grace keeps the source alive and replays the buffer with no loading flash', () => {
  let totalSourceSubscriptions = 0
  const subject = new BehaviorSubject('edit-state-1')
  const source$ = new Observable<string>((subscriber) => {
    totalSourceSubscriptions += 1
    const subscription = subject.subscribe(subscriber)
    return () => subscription.unsubscribe()
  })
  const editState$ = source$.pipe(
    distinctUntilChanged(),
    shareReplay({bufferSize: 1, refCount: true}),
  )

  const firstFrames: string[] = []
  const first = render(<EditStateProbe editState$={editState$} frames={firstFrames} />)
  expect(firstFrames.at(-1)).toBe('edit-state-1')

  // Pane-transition shape: the old pane unmounts and the new one mounts within the
  // same tick. The asapScheduler grace keeps the shared subscription alive, so the
  // remount replays the buffered value synchronously — no refetch, no flash.
  first.unmount()
  const secondFrames: string[] = []
  render(<EditStateProbe editState$={editState$} frames={secondFrames} />)

  expect(secondFrames[0]).toBe('edit-state-1')
  expect(totalSourceSubscriptions).toBe(1)
})

// ---------------------------------------------------------------------------
// Render-phase warm-up blip
// (packages/sanity/src/core/config/__tests__/bifurClientConnection.test.ts guards the
//  WebSocket client against exactly this subscribe/unsubscribe blip)
// ---------------------------------------------------------------------------

function DisabledProbe({source$}: {source$: Observable<string>}) {
  useObservable(source$, undefined, {disabled: true})
  return null
}

test('a disabled hook never probes the source: no render-phase blip at all', async () => {
  // `disabled: true` skips both the live store subscription and the replacement warm-up, so
  // consumers like bifur's WebSocket connection see zero subscriptions from disabled hooks.
  // (Before initialValue became required, a disabled hook without one still ran the warm-up
  // probe during render — the momentary subscribe/unsubscribe blip
  // bifurClientConnection.test.ts guards against.)
  const events: string[] = []
  const source$ = new Observable<string>(() => {
    events.push('subscribe')
    return () => {
      events.push('unsubscribe')
    }
  })

  const {rerender} = render(<DisabledProbe source$={source$} />)
  rerender(<DisabledProbe source$={source$} />)
  rerender(<DisabledProbe source$={source$} />)

  await act(async () => {
    await tick()
  })
  expect(events).toEqual([])
})

/** Kept at module scope so identity is stable across re-renders. */
function ReplacementWarmUpProbe({observable}: {observable: Observable<string>}) {
  useObservable(observable, 'initial')
  return null
}

test('a replacement warm-up probes the source once, bridged into the commit subscription without churn', () => {
  // The render-phase warm-up now only runs for replacement observables after an emission. With a
  // live consumer the probe's refCount blip is bridged by the asapScheduler grace into the
  // commit-time store subscription, so the source sees exactly one uninterrupted subscription
  // with no subscribe/unsubscribe churn in between — and re-renders never probe again.
  const events: string[] = []
  const source$ = new Observable<string>((subscriber) => {
    events.push('subscribe')
    subscriber.next('value')
    return () => {
      events.push('unsubscribe')
    }
  })
  const first$ = new BehaviorSubject('first')

  const {rerender} = render(<ReplacementWarmUpProbe observable={first$} />)

  // first$ has emitted (sync BehaviorSubject emission on commit), so swapping identities warms
  // the replacement during render.
  rerender(<ReplacementWarmUpProbe observable={source$} />)
  expect(events).toEqual(['subscribe'])

  rerender(<ReplacementWarmUpProbe observable={source$} />)
  rerender(<ReplacementWarmUpProbe observable={source$} />)
  expect(events).toEqual(['subscribe'])
})

// ---------------------------------------------------------------------------
// Deferral safety: stable store observables paired with live selection state
// (packages/sanity/src/core/perspective/__tests__/deferralSafety.test.tsx)
// ---------------------------------------------------------------------------

interface SelectionFrame {
  name: string | undefined
  resolved: string | undefined
}

/**
 * The safe wiring sanity uses (useActiveReleases & friends): both the live selection
 * and the store list are read synchronously, so a single `act` that updates both (the
 * create-then-navigate flow) commits only coherent frames.
 */
function SyncSelectionProbe({
  releases$,
  selection$,
  frames,
}: {
  releases$: Observable<string[]>
  selection$: Observable<string | undefined>
  frames: SelectionFrame[]
}) {
  const name = useSyncObservable(selection$, undefined)
  const releases = useSyncObservable(releases$, [])
  frames.push({name, resolved: name !== undefined && releases.includes(name) ? name : undefined})
  return null
}

/**
 * The counterfactual sanity proved unsafe: the store list read is deferred while the
 * selection stays live. The store observable has a stable identity for the lifetime of
 * the workspace, so the identity-coherent fallback never engages — deferral simply
 * makes the list lag one render behind, tearing against the live selection.
 */
function DeferredSelectionProbe({
  releases$,
  selection$,
  frames,
}: {
  releases$: Observable<string[]>
  selection$: Observable<string | undefined>
  frames: SelectionFrame[]
}) {
  const name = useSyncObservable(selection$, undefined)
  const releases = useObservable(releases$, [])
  frames.push({name, resolved: name !== undefined && releases.includes(name) ? name : undefined})
  return null
}

test('sync reads (sanity’s wiring): no frame pairs a selected release with an unresolved id', () => {
  const releases$ = new BehaviorSubject<string[]>([])
  const selection$ = new BehaviorSubject<string | undefined>(undefined)
  const frames: SelectionFrame[] = []

  render(<SyncSelectionProbe releases$={releases$} selection$={selection$} frames={frames} />)

  // Create release, then navigate to it in the same handler: the store emits the new
  // release and the selection updates in one batch.
  act(() => {
    releases$.next(['release-1'])
    selection$.next('release-1')
  })

  expect(frames).toContainEqual({name: 'release-1', resolved: 'release-1'})
  expect(frames).not.toContainEqual({name: 'release-1', resolved: undefined})
})

test('deferred read of a stable store observable (counterfactual): the selection renders unresolved for a frame', () => {
  const releases$ = new BehaviorSubject<string[]>([])
  const selection$ = new BehaviorSubject<string | undefined>(undefined)
  const frames: SelectionFrame[] = []

  render(<DeferredSelectionProbe releases$={releases$} selection$={selection$} frames={frames} />)

  act(() => {
    releases$.next(['release-1'])
    selection$.next('release-1')
  })

  // The tear sanity's deferralSafety suite proves: the new selection paired with the
  // stale (empty) deferred list. This is *by design* for the deferred hook — the test
  // pins it so the semantics cannot change silently in either direction.
  expect(frames).toContainEqual({name: 'release-1', resolved: undefined})
  // It converges afterwards, but consumers have already observed the torn frame.
  expect(frames.at(-1)).toEqual({name: 'release-1', resolved: 'release-1'})
})

interface CrossFrame {
  active: string[]
  all: string[]
}

/** Both hooks read the very same store observable — one synchronously, one deferred. */
function MixedSyncDeferredProbe({
  releases$,
  frames,
}: {
  releases$: Observable<string[]>
  frames: CrossFrame[]
}) {
  const active = useSyncObservable(releases$, [])
  const all = useObservable(releases$, [])
  frames.push({active, all})
  return null
}

function AllSyncProbe({
  releases$,
  frames,
}: {
  releases$: Observable<string[]>
  frames: CrossFrame[]
}) {
  const active = useSyncObservable(releases$, [])
  const all = useSyncObservable(releases$, [])
  frames.push({active, all})
  return null
}

test('two sync reads of the same store observable always agree (subset invariant)', () => {
  const releases$ = new BehaviorSubject<string[]>([])
  const frames: CrossFrame[] = []

  render(<AllSyncProbe releases$={releases$} frames={frames} />)
  act(() => releases$.next(['release-1']))

  for (const frame of frames) {
    expect(frame.all).toEqual(frame.active)
  }
  expect(frames.at(-1)).toEqual({active: ['release-1'], all: ['release-1']})
})

test('mixing a sync and a deferred read of the same store observable commits a disagreeing frame', () => {
  const releases$ = new BehaviorSubject<string[]>([])
  const frames: CrossFrame[] = []

  render(<MixedSyncDeferredProbe releases$={releases$} frames={frames} />)
  act(() => releases$.next(['release-1']))

  // The impossible state sanity documents ("active release missing from all
  // releases"): the sync read already has the release while the deferred read of the
  // very same snapshot does not.
  expect(frames).toContainEqual({active: ['release-1'], all: []})
  expect(frames.at(-1)).toEqual({active: ['release-1'], all: ['release-1']})
})

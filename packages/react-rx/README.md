[![CI](https://github.com/sanity-io/react-rx/actions/workflows/ci.yml/badge.svg?event=push)](https://github.com/sanity-io/react-rx/actions/workflows/ci.yml) [![npm version](https://img.shields.io/npm/v/react-rx.svg)](https://www.npmjs.com/package/react-rx) [![npm weekly downloads](https://img.shields.io/npm/dw/react-rx.svg)](https://www.npmjs.com/package/react-rx)

[![react-rx-some-smaller](https://user-images.githubusercontent.com/81981/194187624-9abd09da-bf03-4886-b512-78c1f22fc2de.png)](https://react-rx.dev/)

> React hooks for RxJS Observables — live state that cooperates with concurrent rendering

RxJS is how you orchestrate the state that plain React makes hard: live streams (chat messages, LLM tokens), time ("posted 5 seconds ago", intervals, debounce), and data fetching with retry, resume, and cancellation semantics. react-rx is how those streams become React state — with first-class support for Suspense, Transitions, `<Activity>`, SSR, and the React Compiler.

```tsx
// The bridge everyone writes by hand…
const [users, setUsers] = useState<User[]>([])
useEffect(() => {
  const subscription = users$.subscribe(setUsers)
  return () => subscription.unsubscribe()
}, [users$])

// …is one hook. Lifecycle, teardown, sync first emission, SSR: handled.
const users = useObservable(users$, [])
```

## Why react-rx

- **Non-blocking by default.** `useObservable` defers store updates ([`useDeferredValue`](https://react.dev/reference/react/useDeferredValue) semantics): chatty streams can't make typing feel blocked, and updates coalesce under load. The deferral is _identity-coherent_ — when the observable changes (say, memoized on a document id), the previous document's value can never render under the new one.
- **Synchronous emissions paint on the first render.** No re-render-on-mount tax: a `BehaviorSubject` or replayed value renders immediately, on the client and during SSR.
- **First-class [`<Activity>`](https://react.dev/reference/react/Activity) (React 19.2).** Hidden trees keep warm snapshots and reveal instantly; pre-rendered trees start their data fetches during render — no effects required.
- **SSR that never throws.** `useObservable` renders exactly what the client's first paint will show; `useSyncObservable` keeps the strict server-snapshot contract when you want it.
- **React Compiler tested.** The entire test suite runs twice — once plain, once compiled through the React Compiler.
- **Escape hatches with clear contracts.** `useSyncObservable` for controlled inputs and synchronous read-back; `useObservablePromise` for Suspense.
- **Tiny.** ESM-only, tree-shakeable, one small dependency, fully typed.

## Suspense

The `suspense` keyword on this package is earned two ways:

- **[`useObservablePromise`](https://react-rx.dev/reference#useobservablepromise)** turns any observable into a [`use()`](https://react.dev/reference/react/use)-compatible promise: the reader suspends until the _first_ emission, later emissions update in place **without re-suspending**, and synchronous sources never flash a fallback. `preloadObservablePromise` warms the same cache outside render (hover, route loaders, `<Activity>` tabs).
- **`useObservable` is safe to suspend on.** Because its updates are deferred, a store update that causes a child to suspend keeps the already-visible content on screen instead of yanking it back to the nearest fallback — the classic [`useSyncExternalStore` caveat](https://react.dev/reference/react/useSyncExternalStore#caveats), solved. See the [side-by-side demo](https://react-rx.dev/examples/suspense).

```tsx
function Users({users$}: {users$: Observable<User[]>}) {
  const promise = useObservablePromise(users$)
  return (
    <Suspense fallback={<Skeleton />}>
      <UsersList promise={promise} />
    </Suspense>
  )
}

function UsersList({promise}: {promise: Promise<User[]>}) {
  const users = use(promise) // suspends until first emission, then live-updates in place
  return <ul>{users.map(renderUser)}</ul>
}
```

## What people build with it

- **Streaming LLM replies** — tokens accumulate with `scan`, multiple conversations stream concurrently behind `<Activity>`: [live demo](https://react-rx.dev/examples/llm-chat)
- **"x seconds ago" timestamps** — one shared ticking `timer` drives every label: [live demo](https://react-rx.dev/examples/relative-time)
- **Offline-resilient data fetching** — polling that pauses offline, resumes on reconnect, retries with backoff, and keeps last-good data visible: [live demo](https://react-rx.dev/examples/resilient-fetch)
- **Render-as-you-fetch tabs** — Suspense data fetching with hover preloading and `<Activity>` pre-rendering: [data fetching](https://react-rx.dev/examples/data-fetching), [activity](https://react-rx.dev/examples/activity)

## How it compares

Against the other RxJS ↔ React bindings:

| Capability                              | [react-rx](https://react-rx.dev)                                          | [observable-hooks](https://observable-hooks.js.org) | [@react-rxjs/core](https://react-rxjs.org)     | DIY `useEffect`                 |
| --------------------------------------- | ------------------------------------------------------------------------- | --------------------------------------------------- | ---------------------------------------------- | ------------------------------- |
| Deferred, identity-coherent updates     | built into `useObservable`                                                | — (synchronous)                                     | — (synchronous)                                | manual                          |
| Suspense data fetching                  | `use()`-compatible promise; streams update in place without re-suspending | `ObservableResource`                                | suspends until first value                     | manual                          |
| `<Activity>` pre-rendering (React 19.2) | fetches start during render; `preloadObservablePromise` for hover warm-up | —                                                   | —                                              | —                               |
| Sync emission on first paint            | no extra re-render                                                        | `useObservableEagerState`                           | with an active subscription                    | extra render after mount        |
| Setup per stream                        | none — pass any `Observable`                                              | none                                                | `bind()` + `<Subscribe>` / active subscription | subscription plumbing each time |
| SSR                                     | never throws; server matches the client's first paint                     | renders initial state                               | —                                              | manual                          |
| React Compiler                          | test suite runs through it                                                | —                                                   | —                                              | —                               |
| React / RxJS support                    | React 19.2+, RxJS 7.2+                                                    | React 16.8+, RxJS 6–7                               | React 16.8+, RxJS 7+                           | any                             |

The honest flip side: observable-hooks and @react-rxjs support much older React versions. react-rx deliberately targets the newest React — the concurrent-rendering rows above _are_ the point.

Wondering about Zustand, Jotai, XState, or TanStack Query instead? Those solve different shapes of state — see [how react-rx compares to general state libraries](https://react-rx.dev/comparison) for when streams are the right tool and how they compose.

## Used in production

- **[Sanity Studio](https://github.com/sanity-io/sanity)** — react-rx powers live document reads, previews, presence, validation, and permissions throughout the Studio. The adoption PRs are living examples of idiomatic usage at scale: [#13788](https://github.com/sanity-io/sanity/pull/13788), [#13814](https://github.com/sanity-io/sanity/pull/13814), [#13828](https://github.com/sanity-io/sanity/pull/13828).
- **[sanity-io/plugins](https://github.com/sanity-io/plugins)** and the wider Sanity plugin ecosystem — [`@tinloof/sanity-studio`](https://www.npmjs.com/package/@tinloof/sanity-studio), [`sanity-plugin-mux-input`](https://www.npmjs.com/package/sanity-plugin-mux-input), [`sanity-plugin-external-files`](https://www.npmjs.com/package/sanity-plugin-external-files), [`sanity-plugin-phrase`](https://www.npmjs.com/package/sanity-plugin-phrase), and more.
- **[navikt/aksel](https://github.com/navikt/aksel)** — the Norwegian Labour and Welfare Administration's design-system monorepo depends on react-rx directly.

And every interactive example on [react-rx.dev](https://react-rx.dev/examples/llm-chat) runs the real library in a sandbox you can edit.

## Agent skill

Working with an AI coding agent? This repo ships a [`react-rx-best-practices`](https://github.com/sanity-io/react-rx/tree/current/.agents/skills/react-rx-best-practices) skill that teaches agents the idioms: when to use which hook (and when not to), keeping observables referentially stable, refactoring `useEffect` + `.subscribe()` bridges, and when to leave manual subscriptions alone.

```sh
npx skills add sanity-io/react-rx --skill react-rx-best-practices
```

[![skills.sh](https://skills.sh/b/sanity-io/react-rx)](https://skills.sh/sanity-io/react-rx)

## Requirements

- React `^19.2`
- RxJS `^7.2` — operators are imported from `'rxjs'` (not the deprecated `'rxjs/operators'` path). If you're still on an older RxJS, see the [RxJS import migration guide](https://rxjs.dev/guide/importing#how-to-migrate).

---

- [Guide](https://react-rx.dev/guide)
- [API reference](https://react-rx.dev/reference)
- [Comparison](https://react-rx.dev/comparison)
- [Migration (v4 → v5)](https://react-rx.dev/migrate/v4-to-v5)
- [Code examples](https://react-rx.dev/examples/llm-chat)

---

# Contributing and releasing new versions to npm

This package lives in the [`react-rx` monorepo](https://github.com/sanity-io/react-rx) and uses [Changesets](https://github.com/changesets/changesets) to manage versioning and publishing.

When you make a change that should be released, add a changeset to your pull request:

```sh
pnpm changeset
```

Once pull requests with changesets are merged into the `current` branch, a "Version Packages" pull request is opened (and kept up to date) that bumps the affected package versions and updates their changelogs. Merging that pull request publishes the packages to npm through the [`Release` workflow](https://github.com/sanity-io/react-rx/actions/workflows/release.yml), which uses npm [Trusted Publishing](https://docs.npmjs.com/trusted-publishers) (OIDC).

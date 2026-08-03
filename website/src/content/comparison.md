# Comparison

Two different questions get asked about react-rx: "why this instead of another RxJS binding?" and "why streams instead of my state library?". They deserve different answers.

## RxJS ↔ React bindings

If you already have observables, the bindings differ in update timing, Suspense integration, and how much ceremony each stream needs:

| Capability                              | [react-rx](https://react-rx.dev)                                              | [observable-hooks](https://observable-hooks.js.org)              | [@react-rxjs/core](https://react-rxjs.org)     | DIY `useEffect`                |
| --------------------------------------- | ----------------------------------------------------------------------------- | ---------------------------------------------------------------- | ----------------------------------------------- | ------------------------------ |
| Deferred, identity-coherent updates     | built into `useObservable`                                                     | — (synchronous)                                                   | — (synchronous)                                  | manual                         |
| Suspense data fetching                  | `use()`-compatible promise; streams update in place without re-suspending      | `ObservableResource`                                              | suspends until first value                       | manual                         |
| `<Activity>` pre-rendering (React 19.2) | fetches start during render; `preloadObservablePromise` for hover warm-up      | —                                                                 | —                                                | —                              |
| Sync emission on first paint            | no extra re-render                                                             | `useObservableEagerState`                                         | with an active subscription                      | extra render after mount       |
| Setup per stream                        | none — pass any `Observable`                                                   | none                                                              | `bind()` + `<Subscribe>` / active subscription   | subscription plumbing each time |
| SSR                                     | never throws; server matches the client's first paint                          | renders initial state                                             | —                                                | manual                         |
| React Compiler                          | test suite runs through it                                                     | —                                                                 | —                                                | —                              |
| React / RxJS support                    | React 19.2+, RxJS 7.2+                                                         | React 16.8+, RxJS 6–7                                             | React 16.8+, RxJS 7+                             | any                            |

The honest flip side: observable-hooks and @react-rxjs support much older React versions. react-rx deliberately targets the newest React — the concurrent-rendering rows above _are_ the point. See the [Suspense demo](/examples/suspense) and [Activity demo](/examples/activity) for the rows that are easiest to feel.

## General state libraries

Zustand, Jotai, XState, and TanStack Query solve different _shapes_ of state, and all of them are good at their shape. The comparison that matters is which shape your state has:

| | react-rx + RxJS | [Zustand](https://zustand.docs.pmnd.rs) | [Jotai](https://jotai.org) | [XState](https://stately.ai/docs) | [TanStack Query](https://tanstack.com/query) |
| --- | --- | --- | --- | --- | --- |
| Mental model | streams of values over time | one plain store | atoms | state machines & actors | server-state cache |
| Live, multi-emission data (sockets, tokens, presence) | first-class | manual `set()` calls | manual writes | observable/callback actors | polling or manual cache writes |
| Cancellation & race handling | `switchMap` / `exhaustMap` semantics | manual | `AbortSignal` in async atoms | stop/restart actors on transition | cancels/dedupes per query key |
| Time (debounce, intervals, "x seconds ago") | operators (`timer`, `debounceTime`, `auditTime`) | manual | manual | delayed transitions | `staleTime` / `refetchInterval` |
| Combining several async sources | `combineLatest` / `merge` / `zip` | manual | derived async atoms | machine orchestration | dependent queries |
| Request caching & invalidation | compose it yourself (`shareReplay`, ttl) | — | atom-level | — | best-in-class: invalidation, dedupe, persistence |
| Offline & retry | `retry` / `repeat` you compose | — | — | — | built-in retries, refetch-on-reconnect, offline mutation queue |
| Explicit workflow modeling | encoded in stream composition | — | — | statecharts — the whole point | — |
| Suspense | `useObservablePromise` + `use()` | — | async atoms suspend | manual (promise actors) | `useSuspenseQuery` |
| Usable outside React | RxJS runs anywhere | vanilla store | `createStore` | actors run anywhere | framework-agnostic core |

### When to reach for which

- **react-rx + RxJS** when state is _live_, _multi-value_, or _time-based_: streaming tokens, sockets, presence, timers, resumable polling, anything where "the value" is really a sequence of values with cancellation and timing rules.
- **TanStack Query** when state is a _cache of request/response pairs_ and you want invalidation, dedupe, and offline mutations without building them.
- **XState** when the hard part is _which states exist and which transitions are legal_ — checkout flows, wizards, connection lifecycles.
- **Zustand / Jotai** when you need _shared client state_ with minimal ceremony and no streaming semantics.

### They compose

These are not either/or choices:

- XState v5 accepts observables as actor input ([`fromObservable`](https://stately.ai/docs/observable-actors)), so a react-rx codebase can drive machines from the same streams components read.
- A TanStack Query cache can own request/response state while react-rx owns the live layers on top (subscriptions, streaming updates), or a stream can write into the query cache.
- Any external store (Zustand included) can be exposed as an observable and read through `useObservable` alongside the rest of your streams.

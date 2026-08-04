# Comparison

Two different questions get asked about react-rx. "Why this instead of another RxJS binding?" And "why streams instead of my state library?" They deserve different answers.

## RxJS ↔ React bindings

You already have observables. The bindings differ in update timing, Suspense integration, and how much ceremony each stream needs:

| Capability                              | [react-rx](https://react-rx.dev)                                          | [observable-hooks](https://observable-hooks.js.org) | [@react-rxjs/core](https://react-rxjs.org)            | DIY `useEffect`                 |
| --------------------------------------- | ------------------------------------------------------------------------- | --------------------------------------------------- | ----------------------------------------------------- | ------------------------------- |
| Deferred, identity-coherent updates     | Built into `useObservable`                                                | No (synchronous)                                    | No (synchronous)                                      | Manual                          |
| Suspense data fetching                  | `use()`-compatible promise; streams update in place without re-suspending | `ObservableResource`                                | Suspends until first value                            | Manual                          |
| `<Activity>` pre-rendering (React 19.2) | Fetches start during render; `preloadObservablePromise` for hover warm-up | No                                                  | No                                                    | No                              |
| Sync emission on first paint            | No extra re-render                                                        | `useObservableEagerState`                           | With an active subscription                           | Extra render after mount        |
| Setup per stream                        | None; pass any `Observable`                                               | None                                                | `bind()` plus `<Subscribe>` or an active subscription | Subscription plumbing each time |
| SSR                                     | Never throws; server matches the client's first paint                     | Renders initial state                               | No                                                    | Manual                          |
| React Compiler                          | Test suite runs through it                                                | No                                                  | No                                                    | Not applicable                  |
| React / RxJS support                    | React 19.2+, RxJS 7.2+                                                    | React 16.8+, RxJS 6 and 7                           | React 16.8+, RxJS 7+                                  | Any                             |

The honest flip side: observable-hooks and @react-rxjs support much older React versions. react-rx targets the newest React on purpose. The concurrent-rendering rows above are the reason.

Want to feel the differences? Try the [Suspense demo](/examples/suspense) and the [Activity demo](/examples/activity).

## General state libraries

Zustand, Jotai, XState, and TanStack Query solve different _shapes_ of state. All of them are good at their shape. The question that matters: which shape does your state have?

|                                                       | react-rx + RxJS                                 | [Zustand](https://zustand.docs.pmnd.rs) | [Jotai](https://jotai.org)   | [XState](https://stately.ai/docs) | [TanStack Query](https://tanstack.com/query)                   |
| ----------------------------------------------------- | ----------------------------------------------- | --------------------------------------- | ---------------------------- | --------------------------------- | -------------------------------------------------------------- |
| Mental model                                          | Streams of values over time                     | One plain store                         | Atoms                        | State machines and actors         | Server-state cache                                             |
| Live, multi-emission data (sockets, tokens, presence) | First-class                                     | Manual `set()` calls                    | Manual writes                | Observable/callback actors        | Polling or manual cache writes                                 |
| Cancellation and race handling                        | `switchMap` / `exhaustMap` semantics            | Manual                                  | `AbortSignal` in async atoms | Stop/restart actors on transition | Cancels and dedupes per query key                              |
| Time (debounce, intervals, "x seconds ago")           | Operators: `timer`, `debounceTime`, `auditTime` | Manual                                  | Manual                       | Delayed transitions               | `staleTime` / `refetchInterval`                                |
| Combining several async sources                       | `combineLatest` / `merge` / `zip`               | Manual                                  | Derived async atoms          | Machine orchestration             | Dependent queries                                              |
| Request caching and invalidation                      | Compose it yourself (`shareReplay`, ttl)        | No                                      | Atom-level                   | No                                | Best-in-class: invalidation, dedupe, persistence               |
| Offline and retry                                     | `retry` / `repeat` you compose                  | No                                      | No                           | No                                | Built-in retries, refetch-on-reconnect, offline mutation queue |
| Explicit workflow modeling                            | Encoded in stream composition                   | No                                      | No                           | Statecharts, the whole point      | No                                                             |
| Suspense                                              | `useObservablePromise` + `use()`                | No                                      | Async atoms suspend          | Manual (promise actors)           | `useSuspenseQuery`                                             |
| Usable outside React                                  | RxJS runs anywhere                              | Vanilla store                           | `createStore`                | Actors run anywhere               | Framework-agnostic core                                        |

### When to reach for which

- **react-rx + RxJS** when state is _live_, _multi-value_, or _time-based_. Streaming tokens, sockets, presence, timers, resumable polling. Anything where "the value" is really a sequence of values with cancellation and timing rules.
- **TanStack Query** when state is a _cache of request/response pairs_. You get invalidation, dedupe, and offline mutations without building them.
- **XState** when the hard part is _which states exist and which transitions are legal_. Checkout flows, wizards, connection lifecycles.
- **Zustand / Jotai** when you need _shared client state_ with minimal ceremony and no streaming semantics.

### They compose

These are not either/or choices:

- XState v5 accepts observables as actor input ([`fromObservable`](https://stately.ai/docs/observable-actors)). A react-rx codebase can drive machines from the same streams components read.
- A TanStack Query cache can own request/response state while react-rx owns the live layers on top (subscriptions, streaming updates). A stream can also write into the query cache.
- Any external store (Zustand included) can be exposed as an observable and read through `useObservable`, next to the rest of your streams.

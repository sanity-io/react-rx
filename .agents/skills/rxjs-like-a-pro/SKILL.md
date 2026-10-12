---
name: rxjs-like-a-pro
description: >
  Write and review RxJS code, including React components that use react-rx. Use this skill when writing,
  refactoring, reviewing, or debugging code that imports from 'rxjs' or 'react-rx'.
  Trigger on mentions of observables, subscriptions, RxJS operators, or reactive streams. Even if the user
  doesn't say "RxJS" explicitly, activate when you see patterns like `.pipe()`, `.subscribe()`, `Observable`,
  `Subject`, `BehaviorSubject`, `switchMap`, `mergeMap`, or similar.
---

# Working with RxJS and react-rx

Use operators to describe how values change, and subscribe where a consumer needs the result.
Before refactoring, identify who owns the subscription, when it should start and stop, and what
should happen on loading, errors, and cancellation. Preserve those behaviors.

## React components with react-rx

When the project uses `react-rx`, the React-specific decisions — auditing `useState` +
`useEffect` + `.subscribe()` bridges, choosing between `useObservable`, `useSyncObservable`,
`useObservablePromise`, and `useObservableSubject`, keeping the observable identity stable, and
the SSR / `<Activity>` / Suspense pitfalls — live in the dedicated **`react-rx-best-practices`**
skill. Use that skill for anything that reads an observable from a React component. Keep using
this skill for composing the observables themselves (operators, flattening, error handling,
sharing, custom operators) regardless of framework.

This is usage guidance, not a request to migrate an application.

## Reference files

For detailed examples and patterns, read the relevant reference file:

- `references/loading-state-patterns.md` — Deriving loading/error state in the chain, the `withLoadingState`
  custom operator, and using `scan` to preserve previous results across loading states. Read when working with
  async data fetching that needs loading indicators.
- `references/massive-observable.md` — How to refactor bloated `new Observable()` constructors into small
  focused pieces. Read when you see a `new Observable` callback longer than ~10 lines.
- `references/inner-observable-chains.md` — Building rich inner observable sequences with timing, delays, and
  animation phases. Read when composing multi-step async sequences or replacing `setTimeout` patterns.
- `references/custom-operators.md` — How to write inline and extracted custom operators with `OperatorFunction`.
  Read when extracting reusable stream logic.

## Compose before subscribing

The most common RxJS mistake is subscribing too early and then doing imperative work inside the callback —
tracking state in variables, calling functions with side effects, or worse, subscribing to _another_ observable
inside the callback (the "subscribe-in-subscribe" pattern).

Nested subscriptions make cancellation, retries, and cleanup harder to follow. Put dependent work in
the same pipeline so one subscription controls its lifetime.

```typescript
// ❌ Bad: subscribe-in-subscribe with manual state tracking
let currentData: Data | null = null
let loading = false

input$.subscribe((value) => {
  loading = true
  fetchData(value).subscribe((data) => {
    currentData = data
    loading = false
  })
})

// ✅ Good: everything is in the chain
const data$ = input$.pipe(switchMap((value) => fetchData(value)))
```

For loading state, derive it inside the chain using `startWith` — see `references/loading-state-patterns.md`.

## Keep observable constructors focused

Avoid putting listeners, promises, retries, and nested subscriptions into one large
`new Observable(subscriber => { ... })` callback. Separate the source adapter from the operations
that transform its values.

The `new Observable()` constructor should be small and focused — a thin bridge from _one_ non-reactive source
into the reactive world. For promise-based sources, use `defer(() => promise)` instead. Retry logic, error
handling, combining sources — all of that belongs in the operator chain.

See `references/massive-observable.md` for a full before/after example.

## Choosing the Right Flattening Operator

| Operator     | Behavior                                      | Use when                                                                       |
| ------------ | --------------------------------------------- | ------------------------------------------------------------------------------ |
| `switchMap`  | Cancels previous inner when new value arrives | User input, search-as-you-type, route changes — only the latest matters        |
| `mergeMap`   | Runs all inner observables concurrently       | Independent operations where all results are needed (logging, fire-and-forget) |
| `concatMap`  | Queues inner observables, runs in order       | Order matters and nothing should be dropped (sequential writes, queues)        |
| `exhaustMap` | Ignores new values while inner is running     | Preventing duplicate submissions (form submit clicks)                          |

Use `switchMap` when only the latest result matters, such as a search. Do not use it for writes
that all need to finish; consider `concatMap`, `mergeMap`, or `exhaustMap` according to the required
ordering and duplicate-submission behavior.

The inner observable doesn't have to be a single request — it can be an entire timeline of events using
`concat`, `merge`, `timer`, `delay`. See `references/inner-observable-chains.md` for animation and timing
examples.

## Error Handling

Put `catchError` on the _inner_ observable when you want the outer stream to keep running. Put it on the
outer stream only when you truly want to replace the entire stream on error:

```typescript
// ❌ Bad: catchError on outer stream kills it for good
source$.pipe(
  switchMap((value) => fetchData(value)),
  catchError((err) => of(fallback)),
)

// ✅ Good: catchError inside switchMap — outer stream survives
source$.pipe(switchMap((value) => fetchData(value).pipe(catchError((err) => of(fallback)))))
```

Same principle applies to `retry` — retry the inner operation, not the entire outer stream:

```typescript
source$.pipe(
  switchMap((value) =>
    fetchData(value).pipe(
      retry({count: 3, delay: 1000}),
      catchError((err) => of(fallback)),
    ),
  ),
)
```

## Avoiding Memory Leaks

The fewer manual subscriptions, the fewer chances to leak. In order of preference:

1. **Don't subscribe at all** — let the framework handle subscription lifecycle where possible
2. **Use operators that complete naturally** — `first()`, `take(n)`, `takeUntil(destroy$)`
3. **Use `takeUntil` with a notifier**:

```typescript
const destroy$ = new Subject<void>();
someObservable$.pipe(
  takeUntil(destroy$),
).subscribe(value => /* ... */);

// In teardown: destroy$.next(); destroy$.complete();
```

Place `takeUntil` after flattening operators when it should stop their inner subscriptions too.
Operators after it can otherwise keep work running after the notifier emits.

4. **Compose into a single subscription** — if you have multiple independent streams with side effects,
   `merge` them into one and subscribe once.

## Hot vs Cold

- **Cold** observables start work for each subscription. Examples include `of()` and `fromFetch`.
- **Hot** sources produce values independently of an individual subscriber. A `Subject` broadcasts
  values to its current subscribers.
- `fromEvent` observes an external event source, but attaches a separate handler per subscription.
  Creating an observable with `new Observable` does not, by itself, tell you whether its source is hot.

Use `shareReplay({bufferSize: 1, refCount: true})` when consumers should share work and receive the
latest value. `refCount: true` releases an ongoing source when the last subscriber leaves. Keep a
subscription alive without consumers only when that lifetime is intentional and bounded.

## Deriving State Reactively

Instead of mutable variables updated from multiple subscriptions, derive state from streams:

```typescript
// ❌ Bad: mutable state, inconsistent windows
let items: Item[] = []
let filter = ''
items$.subscribe((i) => {
  items = i
  recompute()
})
filter$.subscribe((f) => {
  filter = f
  recompute()
})

// ✅ Good: always consistent
const filteredItems$ = combineLatest([items$, filter$]).pipe(
  map(([items, filter]) => items.filter((item) => item.name.includes(filter))),
)
```

**`combineLatest` vs `withLatestFrom`**: `combineLatest` emits when _any_ input emits (all inputs drive
output). `withLatestFrom` emits only when the _source_ emits (one driver, others are context).

**`startWith`**: `combineLatest` won't emit until every input has emitted at least once. Use `startWith` to
provide initial values and unblock the stream.

## Subjects: Use Sparingly

`Subject`, `BehaviorSubject`, and `ReplaySubject` connect imperative producers to streams. They are
useful for callbacks, event buses, and state with an explicit owner. If several callers use `.next()`
to keep derived values in sync, calculate those values with operators instead.

## Custom Operators

Don't be afraid to write them — they're just functions with the signature
`(source: Observable<A>) => Observable<B>`. Extract repeated `.pipe()` chains into named operators with
`OperatorFunction<In, Out>`. See `references/custom-operators.md` for inline and extracted examples.

## Use `tap` for effects that belong in the pipeline

Use `tap` when an effect should be part of a composed pipeline, such as logging a successful result.
A final `subscribe` callback is also valid at a consumer boundary. Do not move it merely to make
every `.subscribe()` argument-free.

`tap` does not await promises. For an asynchronous write that must finish before the next operation,
use a flattening operator such as `concatMap`.

```typescript
// ❌ Bad: side effects crammed into subscribe
source$.pipe(switchMap((value) => fetchData(value))).subscribe(
  (data) => {
    updateUI(data)
    logAnalytics('data_loaded', data)
    cache.set(data)
  },
  (err) => showError(err),
)

// ✅ Good: side effects in tap, subscribe just activates
source$
  .pipe(
    switchMap((value) => fetchData(value)),
    tap((data) => updateUI(data)),
    tap((data) => logAnalytics('data_loaded', data)),
    tap((data) => cache.set(data)),
    tap({error: (err) => showError(err)}),
  )
  .subscribe()
```

Effects in the pipeline can be placed before or after filters and sharing operators. Placement matters:
an effect before `share` runs once per shared source emission; an effect after it runs for each subscriber.
Moving an effect can therefore change how often it runs.

`tap` also accepts an observer object with lifecycle hooks — particularly useful for debugging:

```typescript
source$.pipe(
  tap({
    subscribe: () => console.log('subscribed!'),
    next: (value) => console.log('value:', value),
    error: (err) => console.log('error:', err),
    complete: () => console.log('complete'),
    unsubscribe: () => console.log('unsubscribed'),
    finalize: () => console.log('finalized (complete or unsubscribe)'),
  }),
)
```

The `subscribe` hook is especially handy for debugging "why isn't my stream emitting?" — it confirms whether
anything is actually subscribing.

## Avoid Unnecessary Promise Conversion

`firstValueFrom`/`lastValueFrom` are appropriate for one-shot interop with promise-based APIs. They're a code
smell when used inside subscribe callbacks to avoid learning the reactive approach — that work belongs in the
chain with `switchMap`.

## Quick Reference: Common Refactoring Patterns

| Anti-pattern                                | Refactoring                                                            |
| ------------------------------------------- | ---------------------------------------------------------------------- |
| `a$.subscribe(x => b$.subscribe(y => ...))` | `a$.pipe(switchMap(x => b$))` (or `mergeMap`/`concatMap`/`exhaustMap`) |
| Mutable variable updated in subscribe       | `scan()` or `combineLatest` to derive state                            |
| `setTimeout` inside subscribe               | `delay()`, `timer()`, or `debounceTime()`                              |
| `if` guard in subscribe to skip values      | `filter()` before subscribe                                            |
| `try/catch` inside subscribe                | `catchError()` in the pipe                                             |
| Manual request cancellation flags           | `switchMap` (auto-cancels previous)                                    |
| Multiple subscribes to same cold observable | `shareReplay({ bufferSize: 1, refCount: true })`                       |
| `.subscribe()` just to trigger side effects | `tap()` for side effects, keep the chain going                         |
| Massive `new Observable()` constructor      | Small focused constructors + `defer()` + operator composition          |
| `await firstValueFrom()` inside subscribe   | `switchMap` — stay in the chain                                        |

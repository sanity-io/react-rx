# react-rx

## 7.0.0-next.3

### Major Changes

- [#515](https://github.com/sanity-io/react-rx/pull/515) [`b0249a0`](https://github.com/sanity-io/react-rx/commit/b0249a0a574816feda25900e6205059e240f0043) Thanks [@stipsan](https://github.com/stipsan)! - **`useObservablePromise` now starts a swapped-in observable during the render of an already-live consumer** — React's canonical [client-side refetch pattern](https://react.dev/reference/react/use#re-fetching-data-in-client-components) (swap the data source inside `startTransition`, or behind `useDeferredValue`) works without preloading.

  A suspended transition render never commits, and commit is otherwise what starts the fetch — so a bare observable swap inside a transition used to deadlock silently: the old content stayed up, `isPending` never cleared, and no fetch was ever made, which made `preloadObservablePromise` in the event handler mandatory. The fetch now has three triggers:

  - **Commit** — a non-`disabled` consumer that called the hook commits (mounts, `<Activity>` reveals). Unchanged.
  - **Live-swap render** — a consumer that is already committed, visible, and subscribed re-renders with a new observable identity: the new source is subscribed during that render, so the suspended transition settles, retries, and commits. This is the new trigger, and it makes `startTransition(() => setObservable(next$))` behave like React's promise-swapping examples.
  - **`preloadObservablePromise`** — explicit and render-independent. No longer required for transitions; still the way to warm on hover or in route loaders (so a swap can commit with no pending period at all) and to feed hidden `<Activity>` pre-renders.

  Everything that keeps rendering side-effect-free stays lazy: fresh mounts (the Suspense fallback's commit starts the fetch), server rendering, `disabled` consumers, and hidden `<Activity>` trees — hiding tears down the live subscription, so a hidden tree never qualifies, and swapping observables while hidden stays fully paused.

  One consequence to know about: a transition abandoned after its swap render (for example, superseded by another swap) can have started a fetch nobody consumes. The entry settles into the shared cache and is evicted after `ttl`. As with `preloadObservablePromise`, bound never-settling sources with RxJS [`timeout`](https://rxjs.dev/api/index/function/timeout) where a stalled fetch is possible.

## 7.0.0-next.2

### Major Changes

- [#520](https://github.com/sanity-io/react-rx/pull/520) [`9df53b8`](https://github.com/sanity-io/react-rx/commit/9df53b8574977dbc0f2decb1cd12860a77447afa) Thanks [@stipsan](https://github.com/stipsan)! - **Breaking:** `useObservable` and `useSyncObservable` never subscribe the observable during render — the render-phase warm-up is gone.

  With `initialValue` required there is always something to render, so the internal warm-up machinery (the per-hook tracker and the eager render-phase probe that captured synchronous emissions for replacement observables) has been removed entirely. Every render — the first one and every identity change alike — shows the resolved `initialValue` (or the shared cache entry's last emission when the observable is already live elsewhere), and the source is only ever subscribed by the store subscription when the component commits.

  What this changes:

  - **Identity swaps render the `initialValue` for one pass.** Swapping to a new observable no longer surfaces its synchronous emission during the swap render; the emission arrives right after the swap commits. The identity-coherent deferral in `useObservable` is unchanged: the previous observable's value never renders under the new identity.
  - **Observable identities must be stable across renders** (`useMemo`, `useState`, module scope — or React Compiler memoization, which does this automatically). Like `useSyncExternalStore`'s `subscribe`, an observable rebuilt on every render is torn down and re-subscribed on every render. Previously the warm-up let that pattern converge; now, when such a source synchronously replays a value that differs from the `initialValue`, every commit forces a re-render that builds yet another identity and the component loops until React aborts with "Maximum update depth exceeded". Sanity's `useCanInviteMembers`-style call sites (`enabled ? store.getGrants().pipe(map(...)) : of(false)` with no memoization) need a `useMemo`.
  - **Synchronously erroring observables surface their error after commit** (from the store subscription via `getSnapshot` on the forced re-render) instead of during the render that used to warm them up.
  - `disabled: true` still guarantees zero subscriptions, and server rendering still paints the resolved `initialValue` without subscribing — both now fall out of the one rule instead of being special cases.

## 7.0.0-next.1

### Major Changes

- [#518](https://github.com/sanity-io/react-rx/pull/518) [`d4eba44`](https://github.com/sanity-io/react-rx/commit/d4eba444525163aff746b9aa253b7a8655996ff1) Thanks [@stipsan](https://github.com/stipsan)! - **Breaking:** remove `useObservableEvent`.

  The hook was layers of abstraction over a plain RxJS `Subject`: it created one internally, returned `subject.next` as a callback, and subscribed your pipeline in an effect. Push events into a `Subject` yourself and read derived streams with `useObservable`, `useSyncObservable`, or `useObservablePromise` — a simpler pattern that also stays aligned with the upcoming [native Observable API](https://github.com/WICG/observable).

  ```tsx
  // Before
  const [value, setValue] = useState(1);
  const handleChange = useObservableEvent((value$) =>
    value$.pipe(map(Number), tap(setValue))
  );

  // After — emissions are the rendered value, no local state or tap needed
  const [rawValue$] = useState(() => new Subject<string>());
  const value$ = useMemo(() => rawValue$.pipe(map(Number)), [rawValue$]);
  const value = useObservable(value$, 1);
  // <input onChange={(event) => rawValue$.next(event.currentTarget.value)} />
  ```

  See the [v6 → v7 migration guide](https://react-rx.dev/migrate/v6-to-v7) for more patterns, including side-effect-only pipelines.

  The `use-effect-event` dependency existed only for this hook and has been removed too — `react-rx` now has zero runtime dependencies beyond its peers.

- [#517](https://github.com/sanity-io/react-rx/pull/517) [`edf04fb`](https://github.com/sanity-io/react-rx/commit/edf04fbbf1b90893e564935f6454a9809323cd76) Thanks [@stipsan](https://github.com/stipsan)! - **Breaking:** `useObservable` and `useSyncObservable` now require the `initialValue` argument.

  The initial value is what renders until the observable emits. Omitting the argument is a type error, and — since JavaScript callers can bypass the types — the hooks also detect a missing argument at runtime (internally defaulting it to the `Symbol.for('react-rx.unsetInitialValue')` sentinel) and throw during render.

  The rules for what counts as a valid `initialValue`:

  - **Every value is valid, `undefined` included** — but it must be passed explicitly: `useObservable(value$, undefined)` renders `undefined` until the first emission, while `useObservable(value$)` throws.
  - **Functions act as initializers**, exactly like `useState`: `useObservable(value$, () => expensiveInitial())` computes the initial value lazily. To use a function itself as the initial value, pass an initializer that returns it: `useObservable(fn$, () => myFunction)`.

  Migration:

  - Call sites that already pass an `initialValue` are unaffected, including their runtime behavior.
  - For call sites that relied on `undefined` being the implicit initial value, pass it explicitly: `useObservable(value$)` → `useObservable(value$, undefined)`.
  - Call sites that relied on the render-phase warm-up subscription (with no `initialValue`, a synchronous emission — e.g. from `of`, `startWith`, or a `BehaviorSubject` — used to be returned from the very first render): there is no warm-up on mount anymore. The first render shows the `initialValue` and the synchronous emission replaces it right after mount, in the same paint cycle as with any other emission. If an observable has no initial value that makes sense, or you want fallback UI while the observable is "loading", use `useObservablePromise` with `use()` and Suspense instead.

  This dramatically simplifies the internal implementation and makes the hooks' behavior uniform:

  - The observable is **never** subscribed during render for its first paint — subscribe-time side effects (network requests, socket connections) can no longer run as render-phase side effects. The only remaining render-phase warm-up is for replacement observables after the hook has received an emission, which is what keeps consumers that rebuild the observable on every render from looping forever.
  - `disabled: true` now always guarantees zero subscriptions (previously the warm-up probe still subscribed once when no `initialValue` was given).
  - Server rendering is uniform: both hooks render the resolved `initialValue` and never subscribe the observable, so `useSyncObservable` no longer hits React's "Missing getServerSnapshot" error and non-deterministic synchronous emissions can no longer cause hydration mismatches.

## 7.0.0-next.0

### Major Changes

- [#510](https://github.com/sanity-io/react-rx/pull/510) [`c3c6460`](https://github.com/sanity-io/react-rx/commit/c3c6460035dac8e818fb8b4629da920fae9a2097) Thanks [@stipsan](https://github.com/stipsan)! - **Breaking:** `useObservablePromise` no longer subscribes the source observable during render.

  Previously the hook eagerly started the source subscription in the render phase (unless `disabled`), which meant rendering — including hidden `<Activity>` pre-renders — triggered fetching as a side effect. Fetching is now strictly commit-driven or explicit:

  - The source subscription starts when a non-`disabled` component that called the hook **commits**, or when `preloadObservablePromise` is called. Rendering alone never subscribes.
  - A hidden `<Activity>` tree that calls the hook is fully paused: no subscription, no fetching, until it is revealed and effects mount. To pre-render hidden content _with_ data, call the hook in a visible parent and pass the promise into the hidden tree, where `use(promise)` lets React pre-render and suspend on its own terms.
  - `preloadObservablePromise` is the mechanism for warming an entry outside of a commit (hover, route loaders, before swapping observables inside a transition). It re-arms the entry's retention window and starts the fetch immediately — in the browser only (see below).

  Migration notes:

  - `use(useObservablePromise(obs$))` in a single component — never a supported pattern — now deadlocks: the component suspends on its own pending promise before the commit that would start the fetch, the same wrong usage as `use()`-ing a promise created during your own render, and it is intentionally not guarded against. The promise is meant to be passed as a prop to a child that reads it with `use()`, with a `<Suspense>` boundary **between** the hook caller and that child so the caller can commit while the child suspends.
  - Synchronously-emitting sources (`of`, `BehaviorSubject`, replayed `shareReplay`) now resolve at the hook caller's commit instead of during render, so a cold mount shows one Suspense fallback pass. Preload the observable to render them without a fallback.
  - Swapping to a new observable inside `startTransition` / behind `useDeferredValue` requires warming the new observable first (for example `preloadObservablePromise` in the event handler): a transition render that suspends never commits, so it can no longer start the fetch.
  - react-rx is a client-only library and never subscribes observables on the server: server rendering emits the Suspense fallback and the fetch starts after hydration, and `preloadObservablePromise` is now a no-op on the server (an inert pending promise; no subscription, no cache entry). A server-started subscription has no unmount to tear it down, a never-settling source would hang, and the module-scope cache would be shared across requests. For React Server Components or server-only flows, fetch with async/await or RxJS `firstValueFrom` and pass the promise/value as a prop.

## 6.0.0

### Major Changes

- [#506](https://github.com/sanity-io/react-rx/pull/506) [`4c3025c`](https://github.com/sanity-io/react-rx/commit/4c3025c6e9bca7d813aa5a7cbd83baba0b7db191) Thanks [@stipsan](https://github.com/stipsan)! - Skip the render-phase warm-up subscription in `useObservable`/`useSyncObservable` when an `initialValue` is provided. The warm-up only exists so sync emissions (`startWith`, `of`, …) can render on the first paint — with an `initialValue` there's already a value to show, so the observable is now first subscribed on commit.

  **Breaking:** when a sync-emitting observable is paired with an `initialValue`, the first paint now shows the `initialValue` — the sync emission arrives right after mount (previously it won on the first render, on the client and in SSR markup).

  Subscribe-time side effects (e.g. `fromFetch`) stay out of the render phase, `disabled: true` now means zero subscriptions (even when the observable is rebuilt every render), and SSR paints the `initialValue` without subscribing the source. Once the hook has received an emission, replacement observables on later renders are warmed during render again so components that rebuild the observable every render settle instead of looping. Omitting `initialValue` behaves exactly as before.

## 5.1.2

### Patch Changes

- [#491](https://github.com/sanity-io/react-rx/pull/491) [`db29f9b`](https://github.com/sanity-io/react-rx/commit/db29f9be50a77710bf49a04e2d1ab7ef8910a29a) Thanks [@stipsan](https://github.com/stipsan)! - perf: build with the React Compiler on oxc (`oxc-transform-react`, the native Rust port) instead of `babel-plugin-react-compiler`. The published output is unchanged — one compiler pass now handles React Compiler, TypeScript, and JSX natively, and babel is no longer part of the build or test pipeline.

## 5.1.1

### Patch Changes

- [#479](https://github.com/sanity-io/react-rx/pull/479) [`0f7bce9`](https://github.com/sanity-io/react-rx/commit/0f7bce90963fa8d540940303e6acfd8a38567dc2) Thanks [@stipsan](https://github.com/stipsan)! - fix: make `useObservable` deferral identity-coherent. The observable identity and its value are now deferred as one snapshot, and when the observable identity changes (e.g. it is memoized on a document id that just changed) the hook falls back to the live value — so the previous identity's value never renders under the new one.

## 5.1.0

### Minor Changes

- [#460](https://github.com/sanity-io/react-rx/pull/460) [`4d9b613`](https://github.com/sanity-io/react-rx/commit/4d9b61332a48a2de053e966ffcbd92f1c5e8ec4f) Thanks [@stipsan](https://github.com/stipsan)! - Add `useObservablePromise` and `preloadObservablePromise`: Suspense-ready data fetching returning a `use()`-compatible promise, with `{disabled, ttl}` options.

## 5.0.1

### Patch Changes

- [#469](https://github.com/sanity-io/react-rx/pull/469) [`e546141`](https://github.com/sanity-io/react-rx/commit/e54614188aa7a7d6547ec570b77af9bebbbb9b7b) Thanks [@stipsan](https://github.com/stipsan)! - Restore the `use-effect-event` ponyfill so effect events see the latest values in `memo` and `forwardRef` components.

## 5.0.0

### Major Changes

- [#459](https://github.com/sanity-io/react-rx/pull/459) [`7ed6b55`](https://github.com/sanity-io/react-rx/commit/7ed6b55b69321592e973af1f903bdcea2776953a) Thanks [@stipsan](https://github.com/stipsan)! - **BREAKING:** `useObservable` now defers store updates with `useDeferredValue` — urgent renders keep the previous value while a background render catches up. Mounts, remounts, and `<Activity>` reveals still render the current snapshot synchronously (no initial-value flash). SSR renders synchronous emissions (instead of always using `initialValue`), no longer throws when `initialValue` is omitted, and fails the server render on synchronously erroring observables.

  New `useSyncObservable` preserves v4's synchronous behavior and strict `getServerSnapshot` contract — use it for controlled inputs, or rename wholesale for a mechanical migration.

  See the [v4 to v5 migration guide](https://react-rx.dev/migrate/v4-to-v5).

- [#434](https://github.com/sanity-io/react-rx/pull/434) [`08379ed`](https://github.com/sanity-io/react-rx/commit/08379ed994a4c6a8d1c20c0d919ff2f374c0a10c) Thanks [@stipsan](https://github.com/stipsan)! - **BREAKING:** Require Node.js `>=22.12`, matching `sanity`'s `engines.node`.

- [#435](https://github.com/sanity-io/react-rx/pull/435) [`bdef45b`](https://github.com/sanity-io/react-rx/commit/bdef45b9a52cb8d01f940fdf7d092db5b8502301) Thanks [@stipsan](https://github.com/stipsan)! - **BREAKING:** Require React `^19.2` as a peer dependency. React 18 is no longer supported.

- [#442](https://github.com/sanity-io/react-rx/pull/442) [`a89ec09`](https://github.com/sanity-io/react-rx/commit/a89ec099cd44a53c9b8d62ab1cc23d7e4f19ee59) Thanks [@stipsan](https://github.com/stipsan)! - Stop publishing CommonJS builds — the package is ESM-only.

- [#449](https://github.com/sanity-io/react-rx/pull/449) [`5e83cbe`](https://github.com/sanity-io/react-rx/commit/5e83cbe9e3eaa99c3e2108535bebaf87ee5bedaf) Thanks [@stipsan](https://github.com/stipsan)! - **BREAKING:** Require RxJS `^7.2` as a peer dependency. Import operators from `'rxjs'` instead of the deprecated `'rxjs/operators'` path.

## 5.0.0-next.7

### Patch Changes

- [#465](https://github.com/sanity-io/react-rx/pull/465) [`664f641`](https://github.com/sanity-io/react-rx/commit/664f6416ef278fff67c78446dca2cc0c597fb49c) Thanks [@stipsan](https://github.com/stipsan)! - Deduplicate the internals of `useObservable` and `useSyncObservable` into shared modules. The two hooks now share a single observable cache, so observing the same observable with both hooks reuses one shared source subscription and snapshot instead of two.

## 5.0.0-next.6

### Major Changes

- [#459](https://github.com/sanity-io/react-rx/pull/459) [`7ed6b55`](https://github.com/sanity-io/react-rx/commit/7ed6b55b69321592e973af1f903bdcea2776953a) Thanks [@stipsan](https://github.com/stipsan)! - **BREAKING:** `useObservable` now defers store updates with `useDeferredValue` — urgent renders keep the previous value while a background render catches up. Mounts, remounts, and `<Activity>` reveals still render the current snapshot synchronously (no initial-value flash). SSR now renders exactly what the first client render would show (synchronous emissions win over the `initialValue`) and no longer throws when `initialValue` is omitted; synchronously erroring observables now fail the server render instead of masking the error until hydration.

  New `useSyncObservable` preserves the exact v4 synchronous behavior, including the strict `getServerSnapshot` contract — switch to it for values feeding controlled inputs or strict server markup control (or rename wholesale for a mechanical migration).

  See the [v4 to v5 migration guide](https://react-rx.dev/migrate/v4-to-v5).

## 5.0.0-next.5

### Patch Changes

- [#453](https://github.com/sanity-io/react-rx/pull/453) [`222f4ef`](https://github.com/sanity-io/react-rx/commit/222f4ef09e68b1db9d6200334ed6ad0e860cec21) Thanks [@stipsan](https://github.com/stipsan)! - Clarify that `useObservable`'s `disabled` option pauses the live store subscription (and keeps returning the last value) but does not skip the render-phase warm-up subscription. Document swapping the observable when zero subscriptions are required.

## 5.0.0-next.4

### Major Changes

- [#449](https://github.com/sanity-io/react-rx/pull/449) [`5e83cbe`](https://github.com/sanity-io/react-rx/commit/5e83cbe9e3eaa99c3e2108535bebaf87ee5bedaf) Thanks [@stipsan](https://github.com/stipsan)! - **BREAKING:** Require RxJS `^7.2` as a peer dependency (operators are imported from `'rxjs'`, which landed in 7.2). Import operators from `'rxjs'` instead of the deprecated `'rxjs/operators'` path.

### Patch Changes

- [#451](https://github.com/sanity-io/react-rx/pull/451) [`8d5f3fb`](https://github.com/sanity-io/react-rx/commit/8d5f3fbe00a21eefcb5463510725240661ea7769) Thanks [@stipsan](https://github.com/stipsan)! - Fix a `useObservable` memory leak where observables that complete or error synchronously upon subscription (e.g. `of(...)`, a replayed-and-completed `shareReplay(1)`, a synchronous `throwError`) left an entry in the internal cache that its own teardown could no longer evict. A later committed mount of the same observable would clean the entry up as a side effect, but that never happens for server renders, `disabled` hooks, or renders that throw before commit — there the entry retained the last emitted snapshot (or error) for as long as the source observable itself stayed alive. In the synchronous error case the stale entry also replayed the old error on later mounts instead of re-subscribing the source, turning transient errors permanent.

## 5.0.0-next.3

### Patch Changes

- [#446](https://github.com/sanity-io/react-rx/pull/446) [`dbd123c`](https://github.com/sanity-io/react-rx/commit/dbd123c24a6187eee7760b8df8ba2a7361507eb7) Thanks [@stipsan](https://github.com/stipsan)! - Vendor `observableCallback` into the package and drop the `observable-callback` dependency.

## 5.0.0-next.2

### Minor Changes

- [#442](https://github.com/sanity-io/react-rx/pull/442) [`a89ec09`](https://github.com/sanity-io/react-rx/commit/a89ec099cd44a53c9b8d62ab1cc23d7e4f19ee59) Thanks [@stipsan](https://github.com/stipsan)! - Stop publishing CommonJS builds. The package is now ESM-only.

  With the existing Node.js `>=22.12` engine requirement, `require()` of ESM is supported, so this is not a breaking change for consumers that follow `engines`.

## 5.0.0-next.1

### Major Changes

- [#435](https://github.com/sanity-io/react-rx/pull/435) [`bdef45b`](https://github.com/sanity-io/react-rx/commit/bdef45b9a52cb8d01f940fdf7d092db5b8502301) Thanks [@stipsan](https://github.com/stipsan)! - **BREAKING:** Require React `^19.2` as a peer dependency. React 18 is no longer supported.

### Patch Changes

- [#440](https://github.com/sanity-io/react-rx/pull/440) [`aa39b2d`](https://github.com/sanity-io/react-rx/commit/aa39b2de60017d62341122c2413b109d1e652b66) Thanks [@stipsan](https://github.com/stipsan)! - Use React's native `useEffectEvent` instead of the `use-effect-event` polyfill.

- [#439](https://github.com/sanity-io/react-rx/pull/439) [`fc965f2`](https://github.com/sanity-io/react-rx/commit/fc965f23b00cd089f1f8cc6fb91bcc0b01bfe214) Thanks [@stipsan](https://github.com/stipsan)! - Compile with React Compiler `target: '19'` and drop the `react-compiler-runtime` dependency. React 19 provides the runtime natively.

## 5.0.0-next.0

### Major Changes

- [#434](https://github.com/sanity-io/react-rx/pull/434) [`08379ed`](https://github.com/sanity-io/react-rx/commit/08379ed994a4c6a8d1c20c0d919ff2f374c0a10c) Thanks [@stipsan](https://github.com/stipsan)! - Require Node.js `>=22.12`, matching `sanity`'s `engines.node` field.

  Packages that declare an incompatible Node engine may see install warnings or failures under strict engine checks (`engine-strict` / `--engine-strict`).

## 4.2.4

### Patch Changes

- [#391](https://github.com/sanity-io/react-rx/pull/391) [`a679bf2`](https://github.com/sanity-io/react-rx/commit/a679bf2e1d5c7c584a8e32c9b598620033c85372) Thanks [@stipsan](https://github.com/stipsan)! - Build with `tsdown` instead of `@sanity/pkg-utils`. The bundled output is now produced by rolldown.

  tsdown generates the `exports` map, so the `source` condition is no longer published — `import` resolves `dist/index.js` and `require` resolves `dist/index.cjs`, as before.

  The `src` directory is no longer published either, which cuts the tarball from 10.8 kB to 7.8 kB. The JS sourcemaps embed their own sources, so stepping through the library in a debugger still shows the original TypeScript.

  The `browserslist` field is gone, as tsdown does not read it. It made no difference to the output: the emitted bundles are byte-identical with and without the syntax lowering targets it resolved to.

## 4.2.3

### Patch Changes

- [#370](https://github.com/sanity-io/react-rx/pull/370) [`878ad83`](https://github.com/sanity-io/react-rx/commit/878ad83635a2921d915dc1f8ad4cd3de0750eb8b) Thanks [@stipsan](https://github.com/stipsan)! - Set up Changesets-based releases with npm trusted publishing. No runtime changes.

## [4.2.2](https://github.com/sanity-io/react-rx/compare/v4.2.1...v4.2.2) (2025-10-20)

### Bug Fixes

- **deps:** upgrade react compiler to v1 ([da11d79](https://github.com/sanity-io/react-rx/commit/da11d798a39496954df02b192601fe287ee8dc85))

## [4.2.1](https://github.com/sanity-io/react-rx/compare/v4.2.0...v4.2.1) (2025-09-23)

### Bug Fixes

- slightly better memo ([#337](https://github.com/sanity-io/react-rx/issues/337)) ([f512043](https://github.com/sanity-io/react-rx/commit/f51204354622f93e623ba18110a4f540afd3720e))

## [4.2.0](https://github.com/sanity-io/react-rx/compare/v4.1.32...v4.2.0) (2025-09-22)

### Features

- add disabled option to useObservable ([#333](https://github.com/sanity-io/react-rx/issues/333)) ([a30621b](https://github.com/sanity-io/react-rx/commit/a30621b6744b4416488d142a7c50ddb315cef66f))

## [4.1.32](https://github.com/sanity-io/react-rx/compare/v4.1.31...v4.1.32) (2025-09-01)

### Bug Fixes

- **deps:** update React Compiler dependencies 🤖 ✨ ([#308](https://github.com/sanity-io/react-rx/issues/308)) ([9a10269](https://github.com/sanity-io/react-rx/commit/9a102693e422c26a4b0472024e5c43b297184eb8))

## [4.1.31](https://github.com/sanity-io/react-rx/compare/v4.1.30...v4.1.31) (2025-07-17)

### Bug Fixes

- **deps:** update dependency use-effect-event to ^2.0.3 ([#311](https://github.com/sanity-io/react-rx/issues/311)) ([312382d](https://github.com/sanity-io/react-rx/commit/312382d1a6275948e6637ccc25b4071c96293194))

## [4.1.30](https://github.com/sanity-io/react-rx/compare/v4.1.29...v4.1.30) (2025-06-16)

### Bug Fixes

- **deps:** update dependency use-effect-event to ^2.0.1 ([5102175](https://github.com/sanity-io/react-rx/commit/51021751ed6268b01dc4d121995a0d049f7472e1))
- **deps:** update React Compiler dependencies 🤖 ✨ ([#294](https://github.com/sanity-io/react-rx/issues/294)) ([c97daa7](https://github.com/sanity-io/react-rx/commit/c97daa7fc480841314cbd1a4b218af59bfeb9b28))

## [4.1.29](https://github.com/sanity-io/react-rx/compare/v4.1.28...v4.1.29) (2025-05-28)

### Bug Fixes

- **deps:** update dependency use-effect-event to v2 ([#289](https://github.com/sanity-io/react-rx/issues/289)) ([d9e0ad0](https://github.com/sanity-io/react-rx/commit/d9e0ad0390e0bccced8202932078b10cc46d38ef))
- **deps:** update React Compiler dependencies 🤖 ✨ ([#281](https://github.com/sanity-io/react-rx/issues/281)) ([61354d0](https://github.com/sanity-io/react-rx/commit/61354d01bede33fc194e2198dc432ea9406313b2))
- **deps:** update React Compiler dependencies 🤖 ✨ ([#282](https://github.com/sanity-io/react-rx/issues/282)) ([cbb0eee](https://github.com/sanity-io/react-rx/commit/cbb0eee8a8c8facca2eb1bbb06204794e5ba4276))

## [4.1.28](https://github.com/sanity-io/react-rx/compare/v4.1.27...v4.1.28) (2025-04-30)

### Bug Fixes

- **deps:** update React Compiler dependencies 🤖 ✨ ([#269](https://github.com/sanity-io/react-rx/issues/269)) ([d7793ef](https://github.com/sanity-io/react-rx/commit/d7793ef26aa5e9182e34b0e75122d45ca5a324cb))
- **deps:** update React Compiler dependencies 🤖 ✨ ([#279](https://github.com/sanity-io/react-rx/issues/279)) ([10eeb19](https://github.com/sanity-io/react-rx/commit/10eeb1951109b8daff6d8aa82a61bdd913ba668d))
- **deps:** upgrade to React Compiler RC ([#278](https://github.com/sanity-io/react-rx/issues/278)) ([a841fa4](https://github.com/sanity-io/react-rx/commit/a841fa44ded8593616d88f42ac7a40af6e099260))

## [4.1.27](https://github.com/sanity-io/react-rx/compare/v4.1.26...v4.1.27) (2025-04-01)

### Bug Fixes

- **deps:** update React Compiler dependencies 🤖 ✨ ([#262](https://github.com/sanity-io/react-rx/issues/262)) ([8941889](https://github.com/sanity-io/react-rx/commit/8941889eb284ae38337c46732c4e72e33414b9de))

## [4.1.26](https://github.com/sanity-io/react-rx/compare/v4.1.25...v4.1.26) (2025-03-24)

### Bug Fixes

- **deps:** update React Compiler dependencies 🤖 ✨ ([#261](https://github.com/sanity-io/react-rx/issues/261)) ([30297f2](https://github.com/sanity-io/react-rx/commit/30297f23354a1bd2ab6a082ab5cd2df7e58b521c))

## [4.1.25](https://github.com/sanity-io/react-rx/compare/v4.1.24...v4.1.25) (2025-03-17)

### Bug Fixes

- **deps:** update React Compiler dependencies 🤖 ✨ ([#249](https://github.com/sanity-io/react-rx/issues/249)) ([2826270](https://github.com/sanity-io/react-rx/commit/28262702992a4bdb90e082259830ce7777af000a))

## [4.1.24](https://github.com/sanity-io/react-rx/compare/v4.1.23...v4.1.24) (2025-03-11)

### Bug Fixes

- **deps:** downgrade `react-compiler-runtime` ([7830e45](https://github.com/sanity-io/react-rx/commit/7830e45583c62ecaa598dc8368999f0db4998274))

## [4.1.23](https://github.com/sanity-io/react-rx/compare/v4.1.22...v4.1.23) (2025-03-10)

### Bug Fixes

- **deps:** update React Compiler dependencies 🤖 ✨ ([#247](https://github.com/sanity-io/react-rx/issues/247)) ([e277d67](https://github.com/sanity-io/react-rx/commit/e277d673deba6b5068ce189954238513ae1e10c6))

## [4.1.22](https://github.com/sanity-io/react-rx/compare/v4.1.21...v4.1.22) (2025-03-03)

### Bug Fixes

- **deps:** update React Compiler dependencies 🤖 ✨ ([#242](https://github.com/sanity-io/react-rx/issues/242)) ([a9ac9de](https://github.com/sanity-io/react-rx/commit/a9ac9de88fc25b5710624133b47d9bbbb250502e))

## [4.1.21](https://github.com/sanity-io/react-rx/compare/v4.1.20...v4.1.21) (2025-02-24)

### Bug Fixes

- **deps:** update React Compiler dependencies 🤖 ✨ ([#240](https://github.com/sanity-io/react-rx/issues/240)) ([ccb0d1c](https://github.com/sanity-io/react-rx/commit/ccb0d1c5a340aaae70efa79d590ce81b8d79b604))

## [4.1.20](https://github.com/sanity-io/react-rx/compare/v4.1.19...v4.1.20) (2025-02-17)

### Bug Fixes

- **deps:** update React Compiler dependencies 🤖 ✨ ([#234](https://github.com/sanity-io/react-rx/issues/234)) ([1917f72](https://github.com/sanity-io/react-rx/commit/1917f72c68dd2cfb6a06bef4ea015f3a77f6148c))

## [4.1.19](https://github.com/sanity-io/react-rx/compare/v4.1.18...v4.1.19) (2025-02-10)

### Bug Fixes

- **deps:** update React Compiler dependencies 🤖 ✨ ([#224](https://github.com/sanity-io/react-rx/issues/224)) ([7c55e9b](https://github.com/sanity-io/react-rx/commit/7c55e9bf9b705934a658160c3c49ce40da6ab880))

## [4.1.18](https://github.com/sanity-io/react-rx/compare/v4.1.17...v4.1.18) (2025-02-04)

### Bug Fixes

- **deps:** update React Compiler dependencies 🤖 ✨ ([#219](https://github.com/sanity-io/react-rx/issues/219)) ([5ac12e2](https://github.com/sanity-io/react-rx/commit/5ac12e294c263b7bc4eb7b95716ce7ddf9df37af))

## [4.1.17](https://github.com/sanity-io/react-rx/compare/v4.1.16...v4.1.17) (2025-01-27)

### Bug Fixes

- **deps:** update React Compiler dependencies 🤖 ✨ ([#212](https://github.com/sanity-io/react-rx/issues/212)) ([4a08774](https://github.com/sanity-io/react-rx/commit/4a087744f745abe6dac48e93c41cf95fb1f141cf))

## [4.1.16](https://github.com/sanity-io/react-rx/compare/v4.1.15...v4.1.16) (2025-01-20)

### Bug Fixes

- **deps:** update React Compiler dependencies 🤖 ✨ ([#211](https://github.com/sanity-io/react-rx/issues/211)) ([c74b420](https://github.com/sanity-io/react-rx/commit/c74b420a7c89367a539682928431917ec5f36546))

## [4.1.15](https://github.com/sanity-io/react-rx/compare/v4.1.14...v4.1.15) (2025-01-13)

### Bug Fixes

- add `'use client'` directive ([03978e8](https://github.com/sanity-io/react-rx/commit/03978e808496b8402c421388f878049f080b9c20))

## [4.1.14](https://github.com/sanity-io/react-rx/compare/v4.1.13...v4.1.14) (2025-01-13)

### Bug Fixes

- **deps:** update React Compiler dependencies 🤖 ✨ ([97f3b97](https://github.com/sanity-io/react-rx/commit/97f3b972e5cdfabc60565a750ed9d20faed9adcd))

## [4.1.13](https://github.com/sanity-io/react-rx/compare/v4.1.12...v4.1.13) (2025-01-13)

### Bug Fixes

- **deps:** update React Compiler dependencies 🤖 ✨ ([#201](https://github.com/sanity-io/react-rx/issues/201)) ([c127c90](https://github.com/sanity-io/react-rx/commit/c127c90cf7df9068d44f3f0befef71b17a61bc36))

## [4.1.12](https://github.com/sanity-io/react-rx/compare/v4.1.11...v4.1.12) (2025-01-06)

### Bug Fixes

- **deps:** update React Compiler dependencies 🤖 ✨ ([#199](https://github.com/sanity-io/react-rx/issues/199)) ([ad67685](https://github.com/sanity-io/react-rx/commit/ad6768542bffd4ff1e9401ff4a70db5ee07cda30))

## [4.1.11](https://github.com/sanity-io/react-rx/compare/v4.1.10...v4.1.11) (2024-12-31)

### Bug Fixes

- **deps:** update React Compiler dependencies 🤖 ✨ ([#191](https://github.com/sanity-io/react-rx/issues/191)) ([b917280](https://github.com/sanity-io/react-rx/commit/b917280776f21b2789ecd232ee12b3c4d4da0eb0))

## [4.1.10](https://github.com/sanity-io/react-rx/compare/v4.1.9...v4.1.10) (2024-12-19)

### Bug Fixes

- **deps:** update dependency @sanity/pkg-utils to ^6.12.2 ([#188](https://github.com/sanity-io/react-rx/issues/188)) ([6cbe41c](https://github.com/sanity-io/react-rx/commit/6cbe41cb19b5192641867c81abf1ea0055b65761))

## [4.1.9](https://github.com/sanity-io/react-rx/compare/v4.1.8...v4.1.9) (2024-12-16)

### Bug Fixes

- **deps:** update React Compiler dependencies 🤖 ✨ ([#185](https://github.com/sanity-io/react-rx/issues/185)) ([13f2818](https://github.com/sanity-io/react-rx/commit/13f2818f8fbad8819625cd807a4318208201898d))

## [4.1.8](https://github.com/sanity-io/react-rx/compare/v4.1.7...v4.1.8) (2024-12-09)

### Bug Fixes

- **deps:** update React Compiler dependencies 🤖 ✨ ([#184](https://github.com/sanity-io/react-rx/issues/184)) ([5fd44ac](https://github.com/sanity-io/react-rx/commit/5fd44ac1e5a6d1f136581af46a95b5fc2304559a))
- **deps:** Update website to v19 (major) ([#181](https://github.com/sanity-io/react-rx/issues/181)) ([dd7dff1](https://github.com/sanity-io/react-rx/commit/dd7dff18a279881d8265fa6058ac630941501324))

## [4.1.7](https://github.com/sanity-io/react-rx/compare/v4.1.6...v4.1.7) (2024-11-25)

### Bug Fixes

- **deps:** update React Compiler dependencies 🤖 ✨ ([#166](https://github.com/sanity-io/react-rx/issues/166)) ([b7ab728](https://github.com/sanity-io/react-rx/commit/b7ab728c0cba16a121747fc1f4c249ddb3681fef))

## [4.1.6](https://github.com/sanity-io/react-rx/compare/v4.1.5...v4.1.6) (2024-11-18)

### Bug Fixes

- **deps:** update React Compiler dependencies 🤖 ✨ ([#165](https://github.com/sanity-io/react-rx/issues/165)) ([f4b0414](https://github.com/sanity-io/react-rx/commit/f4b0414834291a04c592f2a3029d521f5f5834ab))

## [4.1.5](https://github.com/sanity-io/react-rx/compare/v4.1.4...v4.1.5) (2024-11-11)

### Bug Fixes

- **deps:** update React Compiler dependencies 🤖 ✨ ([#163](https://github.com/sanity-io/react-rx/issues/163)) ([a3892da](https://github.com/sanity-io/react-rx/commit/a3892da8b9950ac76b767f01796cb27007ca8738))

## [4.1.4](https://github.com/sanity-io/react-rx/compare/v4.1.3...v4.1.4) (2024-11-06)

### Bug Fixes

- **deps:** bump `react-compiler-runtime` ([#156](https://github.com/sanity-io/react-rx/issues/156)) ([33c108c](https://github.com/sanity-io/react-rx/commit/33c108c3b87b3516c51f365a08019e618cd0c407))

## [4.1.3](https://github.com/sanity-io/react-rx/compare/v4.1.2...v4.1.3) (2024-11-05)

### Bug Fixes

- allow `undefined` as a snapshot value ([#151](https://github.com/sanity-io/react-rx/issues/151)) ([98167f4](https://github.com/sanity-io/react-rx/commit/98167f4590ac0451f7c3a8d4654649e5c8979ef0))

## [4.1.2](https://github.com/sanity-io/react-rx/compare/v4.1.1...v4.1.2) (2024-11-04)

### Bug Fixes

- react strict mode race condition ([#150](https://github.com/sanity-io/react-rx/issues/150)) ([a29e520](https://github.com/sanity-io/react-rx/commit/a29e520e70b47a081863a0109914a564792f4761))

## [4.1.1](https://github.com/sanity-io/react-rx/compare/v4.1.0...v4.1.1) (2024-11-04)

### Bug Fixes

- **deps:** Update dependency react-compiler-runtime to v19.0.0-beta-9ee70a1-20241017 ([#147](https://github.com/sanity-io/react-rx/issues/147)) ([c0bcc2c](https://github.com/sanity-io/react-rx/commit/c0bcc2c62ba0d723397fb605d60119ee8861aa31))

## [4.1.0](https://github.com/sanity-io/react-rx/compare/v4.0.1...v4.1.0) (2024-10-31)

### Features

- add react-compiler ([#141](https://github.com/sanity-io/react-rx/issues/141)) ([e345f8c](https://github.com/sanity-io/react-rx/commit/e345f8c6556f435bdadf13f9fe877aedf5862530))

## [4.0.1](https://github.com/sanity-io/react-rx/compare/v4.0.0...v4.0.1) (2024-10-31)

### Bug Fixes

- **deps:** Update website to v3 (major) ([#138](https://github.com/sanity-io/react-rx/issues/138)) ([ca280d1](https://github.com/sanity-io/react-rx/commit/ca280d1e04bfc68204dc343cef76649ac8a069e9))
- refactor initial value to not need a useRef + useEffect loop ([#143](https://github.com/sanity-io/react-rx/issues/143)) ([adc60ea](https://github.com/sanity-io/react-rx/commit/adc60eab739e450ab46e22872e5c60748a0e0d26))

## [4.0.0](https://github.com/sanity-io/react-rx/compare/v3.1.3...v4.0.0) (2024-07-29)

### ⚠ BREAKING CHANGES

- **useObservable:** This should normally not cause any problems, but given that it introduces a change in behavior wrt. timing of observable unsubscription, it can potentially cause race conditions in rare cases, especially if side-effects are performed in response to observable emissions.
  The modifications required to make the test suite pass should be a good indication of the breaking nature of these changes, although the tests suites are in the majority of cases asserting internal behavior.

### Bug Fixes

- **useObservable:** eagerly subscribe with delayed refcount expiry ([#115](https://github.com/sanity-io/react-rx/issues/115)) ([d81d5af](https://github.com/sanity-io/react-rx/commit/d81d5af9b7fc6af85cdebfac3d53096b058c991d))

## [3.1.3](https://github.com/sanity-io/react-rx/compare/v3.1.2...v3.1.3) (2024-07-11)

### Bug Fixes

- use proper closures ([#107](https://github.com/sanity-io/react-rx/issues/107)) ([5e14944](https://github.com/sanity-io/react-rx/commit/5e149442c0b61e088f103b3f3f35e271e7d9bad0))

## [3.1.2](https://github.com/sanity-io/react-rx/compare/v3.1.1...v3.1.2) (2024-07-10)

### Bug Fixes

- use `use-effect-event` ([#106](https://github.com/sanity-io/react-rx/issues/106)) ([ec8df18](https://github.com/sanity-io/react-rx/commit/ec8df1838f5dba8a6f9df98ad5a080b269c64593))

## [3.1.1](https://github.com/sanity-io/react-rx/compare/v3.1.0...v3.1.1) (2024-06-20)

### Bug Fixes

- remove react-compiler export condition ([#97](https://github.com/sanity-io/react-rx/issues/97)) ([3f32aca](https://github.com/sanity-io/react-rx/commit/3f32acad706dbf47329cf4ab6f5053b274901bee))

## [3.1.0](https://github.com/sanity-io/react-rx/compare/v3.0.0...v3.1.0) (2024-06-19)

### Features

- add experimental react-compiler condition ([#95](https://github.com/sanity-io/react-rx/issues/95)) ([5592c31](https://github.com/sanity-io/react-rx/commit/5592c311e8acf57209894a64baba11fa8bc49729))

## [3.0.0](https://github.com/sanity-io/react-rx/compare/v2.1.3...v3.0.0) (2024-06-12)

### ⚠ BREAKING CHANGES

- remove `useMemoObservable`
- require `rxjs` v7 and above
- use native `useSyncExternalStore`
- remove `forwardRef` export
- remove `reactiveComponent` and `rxComponent` exports
- remove `element` export
- remove `handler` export
- remove `state` export
- remove `context` export
- remove `useWithObservable` export
- remove deprecated `useAsObservable`
- remove deprecated `WithObservable`

### Features

- add `useObservableEvent` ([99bb565](https://github.com/sanity-io/react-rx/commit/99bb56553cc862d0f23f321a416bc1f785c1cda2))
- allow react 19 ([b561d3f](https://github.com/sanity-io/react-rx/commit/b561d3f40f7d44886bef54f265be64f51647930d))

### Bug Fixes

- **deps:** bump `observable-callback` to `1.0.3` ([7786e58](https://github.com/sanity-io/react-rx/commit/7786e583a596dd254cbb771ec55c1615a7b34dff))
- dispose cache entry upon observable termination ([#91](https://github.com/sanity-io/react-rx/issues/91)) ([377f476](https://github.com/sanity-io/react-rx/commit/377f476767f09aadef07f2a34305bb1146a44e58))
- improve SSR support by implementing `getServerSnapshot` ([9fd497a](https://github.com/sanity-io/react-rx/commit/9fd497aec413dc8c74ca299725961f1cfae8c4b7))
- require `rxjs` v7 and above ([d364664](https://github.com/sanity-io/react-rx/commit/d3646649bc036a7034dabb7fbc40275318b6d282))
- **test:** rename vitest.config.{js=>ts} ([bfb1799](https://github.com/sanity-io/react-rx/commit/bfb179983af59b9d5db19da212cde87669e68d6c))
- **test:** replace jest with vitest ([b0efea1](https://github.com/sanity-io/react-rx/commit/b0efea1d42c1928f213b5147df9d527a985efb5c))
- throw errors from observable in getSnapshot() ([807e822](https://github.com/sanity-io/react-rx/commit/807e8220a8af81b34a7220b0e0a4081e80887b82))
- type useObservable accurately ([b132f2b](https://github.com/sanity-io/react-rx/commit/b132f2bdfbdcd2c6cafc09740e8e6da69d2550b6))
- use native `useSyncExternalStore` ([fdc4d14](https://github.com/sanity-io/react-rx/commit/fdc4d14f4be392125c5f8df32fb3b93cfa77061a))
- **useObservable:** infer the return type ([2dda7fc](https://github.com/sanity-io/react-rx/commit/2dda7fc7486e7220d84bab8208b6e1ec34a1ffcc))
- **useObservable:** support error boundaries ([1f42210](https://github.com/sanity-io/react-rx/commit/1f42210466894bd8c04fb25bb30df705e17e8d90))

### Code Refactoring

- remove `context` export ([08c3d4d](https://github.com/sanity-io/react-rx/commit/08c3d4d69f8114f95d241540243b7c0ac4a7c72e))
- remove `element` export ([f873d2a](https://github.com/sanity-io/react-rx/commit/f873d2a76055aa1371258e3a015c20ef2e840d5a))
- remove `forwardRef` export ([bd9ea08](https://github.com/sanity-io/react-rx/commit/bd9ea08789f17b5ffea4cc81814e931ba03cc051))
- remove `handler` export ([8813e57](https://github.com/sanity-io/react-rx/commit/8813e5713bcec2a134338e38b426bdd07a9a3b59))
- remove `reactiveComponent` and `rxComponent` exports ([cf71571](https://github.com/sanity-io/react-rx/commit/cf71571bf336cc6a88707a7e09d4e9ecf561fcad))
- remove `state` export ([86ef5b9](https://github.com/sanity-io/react-rx/commit/86ef5b95c2f90a69f4fece86006d793ef81d2a76))
- remove `useMemoObservable` ([e9ba55f](https://github.com/sanity-io/react-rx/commit/e9ba55feca34d73f8cc1b0b70544ea8d97d4c805))
- remove `useWithObservable` export ([9a57fd8](https://github.com/sanity-io/react-rx/commit/9a57fd8fbf6d0df3c088450ecbe3044107b2bcd2))
- remove deprecated `useAsObservable` ([e128f39](https://github.com/sanity-io/react-rx/commit/e128f392f13ae91ee9ea84b37b1dd7e7ad93b8c4))
- remove deprecated `WithObservable` ([55d30da](https://github.com/sanity-io/react-rx/commit/55d30da3992fe9502f9493065bb8f286e0b8c969))

## [2.1.3](https://github.com/sanity-io/react-rx/compare/v2.1.2...v2.1.3) (2022-10-06)

### Bug Fixes

- mark deprecated APIs with TSDoc ([#24](https://github.com/sanity-io/react-rx/issues/24)) ([0f2f2bf](https://github.com/sanity-io/react-rx/commit/0f2f2bf66089e2a37450513bd472d7ba2b1b37e2))

## [2.1.2](https://github.com/sanity-io/react-rx/compare/v2.1.1...v2.1.2) (2022-10-06)

### Bug Fixes

- **deps:** update dependency observable-callback to ^1.0.2 ([#17](https://github.com/sanity-io/react-rx/issues/17)) ([9e600aa](https://github.com/sanity-io/react-rx/commit/9e600aa717c0ab85eb56c55ec132fef2ac9fd500))
- **pkg:** move overrides logic to renovatebot ([2aafdda](https://github.com/sanity-io/react-rx/commit/2aafdda8c7aad81efbb6d55eadaccef8bea3f86f))

## [2.1.1](https://github.com/sanity-io/react-rx/compare/v2.1.0...v2.1.1) (2022-10-06)

### Bug Fixes

- **package:** remove junk files from published package ([c373641](https://github.com/sanity-io/react-rx/commit/c3736416e96a800c109320d332347e60b97f7c0d))
- **pkg:** add LICENSE ([6a61fd3](https://github.com/sanity-io/react-rx/commit/6a61fd30b67b0f6bab2c94ab8395e33e7a31a1b7))
- **pkg:** update links to the moved repo ([68c56bb](https://github.com/sanity-io/react-rx/commit/68c56bb805fe2fd6141537299b8efb8c9bb6b245))

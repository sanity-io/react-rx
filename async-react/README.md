# Async React Demo

An Observable-powered adaptation of the final state of Ricky Hanlon's React Conf 2025
[Async React demo](https://github.com/rickhanlonii/async-react).

The product and design code deliberately keeps React's native async primitives. RxJS owns the
data layer and `react-rx` connects it to `use()` and Suspense:

- **Ref-counted cache store**: `lessons$` is a keyed observable cache built from RxJS
  primitives (`src/data/cache.ts`). Concurrent subscribers dedupe into one request, and a result
  replays for five minutes after it arrives.
- **Suspense interop**: `useObservablePromise()` turns the shared observable into a promise that a
  child reads with `use()`; `preloadObservablePromise()` warms the same observable before login
  navigation.
- **Invalidation**: mutations and `router.refresh()` clear the store eagerly; `refresh()` then
  re-renders the route inside a transition so it refetches.
- **Actions and feedback**: native transitions and `useOptimistic()` keep immediate feedback
  correctly scheduled while Observable-backed content loads.

View the app: https://async-react.dev/

## Setup

Install:

```bash
pnpm install
```

Run the frontend:

```bash
pnpm --filter async-react dev
```

To run the same app without the React Compiler:

```bash
pnpm --filter async-react dev:no-compiler
```

The demo is a static Vite app. [MSW](https://mswjs.io) registers a service worker (`public/mockServiceWorker.js`) before React renders. App code uses plain `fetch` against same-origin `/api/*` routes. Handlers in `src/mocks` wrap `fake-data` and apply latency with MSW's `delay()`.

The network debugger posts latency settings to `POST /api/debug/network` (also handled by MSW) so config changes show up as real HTTP requests the same way app traffic does. Each configurable endpoint row has a range input for a fixed delay and a **real** checkbox. When **real** is checked, the range input disables and that handler uses a realistic random delay (MSW's 100–400ms browser range) instead of a fixed millisecond value. The chosen duration is stored so the debugger progress bar can track it; a new random duration is picked when **real** is checked and again after each request starts. Settings persist in `localStorage`. `POST /api/login` has no debugger controls and always responds with `delay('real')`.

## Motivation

This demo shows how product code can keep the same Async React shape when its data layer uses
Observables. `react-rx` is an interop layer, not a replacement for React's scheduling primitives.

This is possible, but implementing Async React features in:

- **Routing**: The router uses transitions by default, so users don't need to wrap navigation updates in additional transitions.
- **Data Fetching**: The data fetching layer uses suspense by default, so users can use transitions and suspense throughout their app.
- **Design Components**: The design components expose `action` props so callbacks are in async transitions by default. To provide user feedback, these components also use optimistic updates to automatically show results and delayed loading states, no matter what the product code does in the action.

In the app, there is a network debugger at the bottom. By changing the timing for events, you can see the experience for:

- **Fast network (<150ms)**: No loading states, the app performs and feels synchronous.
- **Slow network (>150ms)**: Automatically displays loading states, and batches updates to prevent async bugs.

## Examples

### Login

Our code for the login form is simple and declarative:

```js
export default function Login() {
  const router = useRouter()
  const [fields, setFields] = useState(initialFieldData)

  async function submitAction() {
    await login()
    await prefetchLessons(router.revision)
    router.navigate('/')
  }
  return (
    <Design.LoginForm fields={fields} setFields={setFields}>
      <Design.Button action={submitAction}>Login</Design.Button>
    </Design.LoginForm>
  )
}
```

When network is fast, login will instantly navigate to the logged in page, with no visible loading states:

https://github.com/user-attachments/assets/6088811c-2a0f-4a14-a3bd-4a96b7dc12a8

When network is slow, but under a second, the prefetching allows us to still animate in the logged in page without a glimmer:

https://github.com/user-attachments/assets/51a158cc-f345-47d1-8408-bfdb48d3ba59

When network is over 1s, we animate to fallbacks while the data loads:

https://github.com/user-attachments/assets/6c04346e-903e-461c-b76e-b35b4c537698

### Home

Our code for the home page is also simple and declarative:

```js
export default function Home() {
  const router = useRouter()
  const search = router.search.q || ''
  const tab = router.search.tab || 'all'
  const revision = router.revision
  const lessonsPromise = useObservablePromise(data.lessons$(tab, search, revision))

  function searchAction(value) {
    router.setParams('q', value)
  }
  function tabAction(value) {
    router.setParams('tab', value)
  }
  async function completeAction(id) {
    await data.mutateToggle(id)
    router.refresh()
  }
  return (
    <>
      <Design.SearchInput value={search} changeAction={searchAction} />
      <Design.TabList activeTab={tab} changeAction={tabAction}>
        <Suspense fallback={<Design.FallbackList />}>
          <LessonList lessonsPromise={lessonsPromise} completeAction={completeAction} />
        </Suspense>
      </Design.TabList>
    </>
  )
}
```

`Home` must not read `lessonsPromise` itself. The Suspense boundary stays between the component
calling `useObservablePromise()` and the `LessonList` child calling `use(lessonsPromise)`. This lets
`Home` commit and start the Observable while the child suspends.

The lessons data layer is one declaration on top of a small cache store:

```ts
export const lessons$ = createObservableCache(
  (tab, search, _revision) => fetchLessons(lessonsUrl(tab, search)),
  {ttl: 5 * 60_000},
)

export function revalidate() {
  lessons$.clear()
}
```

The original demo hand-rolls a `Map<string, Promise>`, a cache key builder, and a `revalidate()`
the router and every mutation must remember to call. Here the store is what RxJS already offers,
composed in `src/data/cache.ts`: one `share()` per key with a `ReplaySubject(1)` connector so late
subscribers get the last result, `resetOnRefCountZero: false` so a request that loses its
subscribers still completes and populates the cache, and `resetOnComplete: () => timer(ttl)` so a
result replays for five minutes after it arrives and then releases its key. Every render, Suspense
retry, and the login page's prefetch of the same key are just subscribers to the same observable, so
they dedupe into a single request, and switching back to a recent tab replays synchronously with no
fetch. `react-rx` needs no changes: it keys its promise cache by observable identity, and the store
is what keeps that identity stable — so none of this depends on compiler-inserted memoization.

Invalidation is the original demo's: mutations and `router.refresh()` call `revalidate()`, which
drops every entry eagerly, and `refresh()` then bumps `revision` inside a transition so the route
re-renders, the swap render starts the fresh fetch, and React keeps the previous list visible until
it settles. `revision` is also an input to `lessons$`, which matters under React Compiler: a compiled
`Home` only re-reads the store when one of the call's inputs changes, so clearing the store alone
would not refetch.

When network is fast, the app feels like it's synchronous:

https://github.com/user-attachments/assets/578a235c-92d7-467b-9664-16ec48f9555c

As network slows, the app will automatically show loading states:

https://github.com/user-attachments/assets/621f1789-19b0-4f29-b00e-55fd0b893cab

# Async React Working Group

At React Conf 2025, we announced a new working group to make Async React the default for React apps.

Check out the [Async React Working Group](https://github.com/reactwg/async-react/discussions) to follow the progress.

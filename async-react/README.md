# Async React Demo — react-rx edition

A fork of [rickhanlonii/async-react](https://github.com/rickhanlonii/async-react), the final state of the React Conf 2025 [Async React talk](https://youtu.be/B_2E96URooA), adapted to [react-rx](https://react-rx.dev): the data layer is RxJS observables read through `useObservablePromise`, and optimistic completion state lives in an observable store instead of `useOptimistic`.

The original app is deployed at https://async-react.dev/. The router, the design system, the network debugger, and the UX are unchanged — that is the point. The adaptation lives in three source files: `src/data/index.ts`, `src/app/Home.tsx`, and `src/design/CompleteButton.tsx`.

## Setup

Install:

```bash
pnpm install
```

Run the frontend:

```bash
pnpm --filter async-react dev
```

Optional: you can use a real backend by updating `.env` to:

```
VITE_USE_REAL_SERVER=true
```

And run the backend:

```
pnpm --filter async-react server
```

This is useful when viewing React Performance Tracks because you can see the real network requests.

## Motivation

This repo shows the future vision for how product code will be written in React without needing additional APIs.

This is possible, but implementing Async React features in:

- **Routing**: The router uses transitions by default, so users don't need to wrap navigation updates in additional transitions.
- **Data Fetching**: The data fetching layer uses suspense by default, so users can use transitions and suspense throughout their app.
- **Design Components**: The design components expose `action` props so callbacks are in async transitions by default. To provide user feedback, these components also use optimistic updates to automatically show results and delayed loading states, no matter what the product code does in the action.

In the app, there is a network debugger at the bottom. By changing the timing for events, you can see the experience for:

- **Fast network (<150ms)**: No loading states, the app performs and feels synchronous.
- **Slow network (>150ms)**: Automatically displays loading states, and batches updates to prevent async bugs.

## The react-rx adaptation

Upstream's data layer is a hand-rolled Map of cached promises. This version replaces it with two observable channels whose update urgencies are deliberately different.

**Canonical data suspends inside transitions.** Each `tab + search` query is one cold observable in a Map, so the observable's identity is the cache key. `useObservablePromise` turns it into a `use()`-compatible promise and shares one fetch among every consumer:

```ts
function lessonsFor(tab: string, search: string): Observable<Lesson[]> {
  const key = `${tab || 'all'}|${search || ''}`
  let query = queries.get(key)
  if (!query) {
    query = defer(() => fetchLessons(`/lessons?tab=${tab || 'all'}&q=${search || ''}`))
    queries.set(key, query)
  }
  return query
}

export function useLessonsPromise(tab: string, search: string) {
  return useObservablePromise(lessonsFor(tab, search), {ttl: LESSONS_TTL})
}
```

Switching tabs or typing in search renders a new identity inside the router's transition, so react-rx starts the fetch during that render and the transition stays pending: the current list holds, the touched control shimmers, and the Suspense skeleton appears only on initial load. After a mutation, `router.refresh()` still calls `revalidate()` — the Map is swapped and the refetch suspends inside the action's transition, exactly like upstream. Login warms the same identity the home page will render by racing `preloadObservablePromise` against upstream's one-second timer.

**Optimistic intent is urgent and lives in the store.** The completed checkmark is a property of the data, not of one button, so it moves out of `useOptimistic` into a desired-state stream: what the user asked for but has not seen yet.

```ts
const events$ = new Subject<StoreEvent>()

const wanted$ = events$.pipe(
  scan(reduceWanted, new Map<string, boolean>()),
  distinctUntilChanged(),
  shareReplay({bufferSize: 1, refCount: false}),
)

export function setComplete(id: string, complete: boolean): Promise<void> {
  events$.next({type: 'want', id, complete})
  return delayedFetch(`/lesson/${id}/toggle`, {method: 'POST'}).then(
    () => undefined,
    (error: unknown) => {
      events$.next({type: 'abandon', id})
      throw error
    },
  )
}
```

`useLessons` reads the intent below the Suspense boundary and merges it into the canonical list, and an effect retires an intent only when a render commits server data that agrees with it. That timing rule is what makes the flash-back unrepresentable: the check flips in the same event tick as the click, holds through the POST and the refetch, and the retirement lands in the commit that already shows the same value. If the POST fails, the `abandon` event reverts exactly what the click set — catch the action's rejection to watch it happen; like upstream, the demo ships no error boundary, so an uncaught action error unmounts the tree.

`CompleteButton` renders `complete` directly and keeps its pending shimmer through the action transition — the design system still owns feedback. `SearchInput` and `TabList` keep `useOptimistic`: theirs is router-state optimism (the pending URL), which is React state and belongs to the design components.

No react-rx API was added for any of this. The store is composition over the shipped surface — `useObservablePromise`, `preloadObservablePromise`, `useSyncObservable`, a `Subject`, and `scan`.

## Examples

### Login

Our code for the login form is simple and declarative:

```js
export default function Login() {
  const router = useRouter()
  const [fields, setFields] = useState(initialFieldData)

  async function submitAction() {
    await login()
    await prefetchLessons()
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

```tsx
export default function Home() {
  const router = useRouter()
  const search = router.search.q || ''
  const tab = router.search.tab || 'all'
  const lessonsPromise = data.useLessonsPromise(tab, search)

  function searchAction(value: string) {
    router.setParams('q', value)
  }
  function tabAction(value: string) {
    router.setParams('tab', value)
  }
  async function completeAction(id: string, complete: boolean) {
    await data.setComplete(id, complete)
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

When network is fast, the app feels like it's synchronous:

https://github.com/user-attachments/assets/578a235c-92d7-467b-9664-16ec48f9555c

As network slows, the app will automatically show loading states:

https://github.com/user-attachments/assets/621f1789-19b0-4f29-b00e-55fd0b893cab

# Async React Working Group

At React Conf 2025, we announced a new working group to make Async React the default for React apps.

Check out the [Async React Working Group](https://github.com/reactwg/async-react/discussions) to follow the progress.

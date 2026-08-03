# Stream-State Recipes

Recurring before/after shapes for moving component state onto streams. These patterns were proven at
scale in the Sanity Studio and sanity-io/plugins codebases (see
[sanity#13788](https://github.com/sanity-io/sanity/pull/13788),
[sanity#13828](https://github.com/sanity-io/sanity/pull/13828),
[plugins#1820](https://github.com/sanity-io/plugins/pull/1820)); the code below is the distilled,
self-contained version.

## 1. The hand-rolled bridge

```tsx
// ❌ Before: lifecycle re-implemented by hand
const [feedItems, setFeedItems] = useState<FeedItem[]>([])
useEffect(() => {
  const subscription = getFeed(repoId).subscribe((response) => {
    setFeedItems(response.items)
  })
  return () => subscription.unsubscribe()
}, [getFeed, repoId])
```

```tsx
// ✅ After: the stream owns shape + errors; the hook owns lifecycle
const EMPTY_FEED: FeedItem[] = []

const feedItems$ = useMemo(
  () =>
    getFeed(repoId).pipe(
      map((response) => response.items),
      startWith(EMPTY_FEED),
      catchError((error) => {
        console.error(error)
        return of(EMPTY_FEED)
      }),
    ),
  [getFeed, repoId],
)
const feedItems = useObservable(feedItems$, EMPTY_FEED)
```

The `startWith` makes the reset-on-param-change behavior explicit: when `repoId` changes, the new
observable synchronously emits the empty state instead of leaving the previous repo's items on
screen. If keeping the previous items visible is the desired behavior, drop the `startWith` and keep
`initialValue` — the point is that the choice is now visible in the pipe.

## 2. Multiple setState calls in one subscribe

A subscribe callback fanning out into `setData` + `setLoading` + `setError` hides the state machine.
Emit one value per state instead:

```tsx
// ❌ Before
const [project, setProject] = useState<Project>()
const [users, setUsers] = useState<User[]>()
const [error, setError] = useState<Error>()
// ...one subscription calls all three setters in different orders
```

```tsx
// ✅ After: one discriminated union, no torn intermediate states
type State =
  | {status: 'loading'}
  | {status: 'error'; error: Error}
  | {status: 'success'; project: Project; users: User[]}

const INITIAL_STATE: State = {status: 'loading'}

const state$ = useMemo(
  () =>
    fetchProject(projectId).pipe(
      switchMap((project) =>
        from(userStore.getUsers(project.members.map((m) => m.id))).pipe(
          map((users) => ({status: 'success', project, users}) as const),
        ),
      ),
      startWith({status: 'loading'} as const),
      catchError((error: Error) => of({status: 'error', error} as const)),
    ),
  [projectId, userStore],
)
const state = useObservable(state$, INITIAL_STATE)
```

Render code narrows on `state.status` — the type system now proves you can't read `users` while
loading.

## 3. Retry / refresh callbacks

A "retry" button that re-runs an effect becomes a parameter stream driving `switchMap`:

```tsx
// ✅ A BehaviorSubject is the retry counter; the fetch derives from it
const [retry$] = useState(() => new BehaviorSubject(0))

const state$ = useMemo(
  () =>
    retry$.pipe(
      switchMap(() =>
        fetchProject(projectId).pipe(
          map((project) => ({status: 'success', project}) as const),
          startWith({status: 'loading'} as const),
          catchError((error: Error) => of({status: 'error', error} as const)),
        ),
      ),
    ),
  [retry$, projectId],
)
const state = useObservable(state$, INITIAL_STATE)

const handleRetry = () => retry$.next(retry$.getValue() + 1)
```

The same shape generalizes to any refetch trigger (polling ticks, visibility changes, form
submissions): model the trigger as a stream, derive the request from it.

## 4. Loading state that is really a Suspense fallback

When the "loading" UI maps 1:1 to a fallback — a spinner where the content will appear — the
`{loading: true}` plumbing can be deleted outright:

```tsx
// ❌ Before: sentinel values threaded through the stream and the render
const state$ = useMemo(
  () => fetchDatasets(client).pipe(startWith(LOADING_SENTINEL)),
  [client],
)
const state = useObservable(state$, LOADING_SENTINEL)
if (state === LOADING_SENTINEL) return <Spinner />
return <DatasetList datasets={state} />
```

```tsx
// ✅ After: Suspense owns "not yet"; the stream only ever emits real values
function Datasets({client}: {client: Client}) {
  const datasets$ = useMemo(() => fetchDatasets(client), [client])
  const promise = useObservablePromise(datasets$)
  return (
    <Suspense fallback={<Spinner />}>
      <DatasetList promise={promise} />
    </Suspense>
  )
}

function DatasetList({promise}: {promise: Promise<Dataset[]>}) {
  const datasets = use(promise)
  return <ul>{datasets.map(/* ... */)}</ul>
}
```

Caveats that decide whether this recipe applies:

- The stream must **not** `startWith` a placeholder (that would fulfill the promise instantly).
- Later emissions update in place without re-suspending — live queries work.
- Errors reject the promise → Error Boundary. Keep `catchError` on the inner observable if the
  screen should degrade instead of throw.
- If the surrounding code has no Suspense/fallback infrastructure, don't force it — recipe 2 with a
  union stream is the right call there.

## 5. Redundant deferral wrappers (react-rx ≥ 5.1)

```tsx
// ❌ Before: hand-rolled deferral — can render the previous observable's value under a new identity
const value = useDeferredValue(useObservable(value$))

// ✅ After: deferral is built into useObservable, and it's identity-coherent
const value = useObservable(value$)
```

If the codebase contains a hand-written "deferred observable value" helper (defer value and
observable together, reset on identity change), it can usually be deleted: that exact contract is
what v5.1's `useObservable` implements and tests.

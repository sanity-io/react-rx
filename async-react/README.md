# Async React Demo — react-rx edition

A fork of [rickhanlonii/async-react](https://github.com/rickhanlonii/async-react), the final state of the React Conf 2025 [Async React talk](https://youtu.be/B_2E96URooA), adapted to [react-rx](https://react-rx.dev): the data layer is RxJS observables read through `useObservablePromise`, and optimistic state lives in an observable store instead of `useOptimistic`.

The original app is deployed at https://async-react.dev/. The router, the design system, the network debugger, and the UX are unchanged — that is the point. The adaptation lives in three source files: `src/data/index.js`, `src/app/Home.jsx`, and `src/design/CompleteButton.jsx`. Packaging moved to pnpm (`package.json`, lockfile, `tsconfig.json`, `vite.config.js`), and one misplaced upstream `eslint-disable` in the router was fixed.

## Setup

This app is its own pnpm workspace (it runs `react@experimental` for `ViewTransition` and `addTransitionType`, pinned to the build upstream shipped with). It consumes the monorepo's `react-rx` from source through a `link:` dependency.

Install and run from this directory:

```bash
pnpm install
pnpm dev
```

Optional: use a real backend by setting `VITE_USE_REAL_SERVER=true` in `.env` and running `pnpm server`. This is useful with React Performance Tracks, so you can see real network requests.

Use the network debugger at the bottom of the app. With fast delays (<150ms) the app performs and feels synchronous, with no loading states. As the network slows, loading states appear on the control you touched, and updates stay coordinated.

## What the react-rx version changes

Upstream's data layer is a hand-rolled Map of cached promises. This version replaces it with two observable channels whose update urgencies are deliberately different.

**Canonical data suspends inside transitions.** Each `tab + search` query is one cold observable in a Map, so the observable's identity is the cache key. `useObservablePromise` turns it into a `use()`-compatible promise and shares one fetch among every consumer:

```js
function lessonsFor(tab, search) {
  const key = `${tab || "all"}|${search || ""}`;
  if (!queries.has(key)) {
    queries.set(
      key,
      defer(() =>
        delayedFetch(`/lessons?tab=${tab || "all"}&q=${search || ""}`),
      ),
    );
  }
  return queries.get(key);
}

export function useLessonsPromise(tab, search) {
  return useObservablePromise(lessonsFor(tab, search), {
    ttl: LESSONS_TTL,
  });
}
```

Switching tabs or typing in search renders a new identity inside the router's transition, so react-rx starts the fetch during that render and the transition stays pending: the current list holds, the touched control shimmers, and the Suspense skeleton appears only on initial load. After a mutation, `router.refresh()` still calls `revalidate()` — the Map is swapped and the refetch suspends inside the action's transition, exactly like upstream. Login warms the same identity the home page will render:

```js
export function prefetchLessons() {
  return Promise.race([
    preloadObservablePromise(lessonsFor("all", "")),
    delay(1000),
  ]);
}
```

**Optimistic intent is urgent and lives in the store.** The completed checkmark is a property of the data, not of one button, so it moves out of `useOptimistic` into a desired-state stream: what the user asked for but has not seen yet.

```js
const events$ = new Subject();

const wanted$ = events$.pipe(
  scan(reduceWanted, new Map()),
  distinctUntilChanged(),
  shareReplay({ bufferSize: 1, refCount: false }),
);

export function setComplete(id, complete) {
  events$.next({ type: "want", id, complete });
  return delayedFetch(`/lesson/${id}/toggle`, { method: "POST" }).catch(
    (error) => {
      events$.next({ type: "abandon", id });
      throw error;
    },
  );
}
```

`useLessons` reads the intent below the Suspense boundary and merges it into the canonical list, and an effect retires an intent only when a render commits server data that agrees with it. That timing rule is what makes the flash-back unrepresentable: the check flips in the same event tick as the click, holds through the POST and the refetch, and the retirement lands in the commit that already shows the same value. If the POST fails, the `abandon` event reverts exactly what the click set — catch the action's rejection to watch it happen; like upstream, the demo ships no error boundary, so an uncaught action error unmounts the tree.

`CompleteButton` renders `complete` directly and keeps its pending shimmer through the action transition — the design system still owns feedback, and the product code got smaller:

```jsx
export default function CompleteButton({ complete, action }) {
  return (
    <PendingButton action={() => action(!complete)}>
      {complete ? <CircleCheckBig className="text-chart-2" size={48} /> : <div />}
    </PendingButton>
  );
}
```

`SearchInput` and `TabList` keep `useOptimistic`: theirs is router-state optimism (the pending URL), which is React state and belongs to the design components.

No react-rx API was added for any of this. The store is composition over the shipped surface — `useObservablePromise`, `preloadObservablePromise`, `useSyncObservable`, a `Subject`, and `scan`.

## Motivation (from upstream)

This repo shows the future vision for how product code is written in React without additional APIs, by implementing Async React features in three layers:

- **Routing**: the router uses transitions by default, so users don't wrap navigation updates themselves.
- **Data fetching**: the data layer suspends by default, so transitions and Suspense work throughout the app.
- **Design components**: components expose `action` props so callbacks run in async transitions by default, and they own their optimistic and delayed loading states no matter what the product code does in the action.

At React Conf 2025, the React team announced a working group to make Async React the default for React apps. Follow the progress at the [Async React Working Group](https://github.com/reactwg/async-react/discussions).

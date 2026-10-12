[![CI](https://github.com/sanity-io/react-rx/actions/workflows/ci.yml/badge.svg?event=push)](https://github.com/sanity-io/react-rx/actions/workflows/ci.yml) [![npm version](https://img.shields.io/npm/v/react-rx.svg)](https://www.npmjs.com/package/react-rx)

[![react-rx-some-smaller](https://user-images.githubusercontent.com/81981/194187624-9abd09da-bf03-4886-b512-78c1f22fc2de.png)](https://react-rx.dev/)

## RxJS values in React, built for concurrent React

react-rx reads values from RxJS observables in React components. You describe how values change with
RxJS — timing, cancellation, several sources at once — and the hooks subscribe, re-render, and clean
up for you. It targets React `^19.2` and is designed around concurrent rendering, Suspense, and
`<Activity>`, so you keep the full power of RxJS without wiring up `useEffect` and `useState` by hand.

Reach for it when your UI follows something that keeps changing: a live document, search results,
upload progress, streamed tokens, or a clock. You don't need to move the rest of your application
state into RxJS.

## Get started

```sh
npm install react-rx rxjs
```

Requires React `^19.2` and RxJS `^7.2`. TypeScript types are included.

```tsx
import {useObservable} from 'react-rx'
import {timer} from 'rxjs'

const seconds$ = timer(0, 1000)

function ElapsedTime() {
  const seconds = useObservable(seconds$, 0)
  return <p>{seconds} seconds elapsed</p>
}
```

`0` is the required initial value. After React commits the component, the hook subscribes and the
display follows the timer. Keep the observable stable — define it outside the component as above, or
use `useMemo` when it depends on props — so renders don't restart the work.

### Replace a render-only effect

If an effect exists only to copy a stream's latest value into state:

```tsx
const [value, setValue] = useState(initialValue)
useEffect(() => {
  const subscription = value$.subscribe(setValue)
  return () => subscription.unsubscribe()
}, [value$])
```

that is the whole job of `useObservable`:

```tsx
const value = useObservable(value$, initialValue)
```

Keep a hand-written effect for subscriptions that do work without rendering a value, such as
analytics or persistence.

## Choose a hook

| What you need                                                  | Use                                        |
| -------------------------------------------------------------- | ------------------------------------------ |
| Display a live value, with something to show before it arrives | `useObservable(stream$, initialValue)`     |
| Drive a controlled input from a stream                         | `useSyncObservable(stream$, initialValue)` |
| Show a Suspense fallback until the first value arrives         | `useObservablePromise(stream$)`            |
| Send component events into an RxJS pipeline                    | `useObservableSubject()`                   |

The value hooks always take an initial value, even if it is `undefined`, and never subscribe during
render. On the server they render that initial value without starting the observable.

## Built for how React renders today

- **Concurrent-safe updates.** `useObservable` defers its updates through React's concurrent
  scheduler, so React can prioritize typing over stream-driven renders. Updates are keyed by
  the observable's identity, so switching sources never shows a stale value under the new one. When
  an edit must land immediately — a controlled input — `useSyncObservable` updates synchronously.
- **Suspense and `use()`.** `useObservablePromise` returns a promise a child reads with React's
  `use()`. Put a `<Suspense>` boundary between the hook and that child: the parent commits, the
  subscription starts, and the first value replaces the fallback while later values update in place.
- **Preloading.** `preloadObservablePromise` starts listening in the browser before a component
  needs the data — on hover, say — so the value is ready when it mounts, with a time-to-live that
  keeps the result briefly after the last subscriber leaves.
- **`<Activity>` aware.** A hook inside a hidden `<Activity>` waits to subscribe until the tree is
  shown; preload or hand it a promise from a visible parent to warm data behind a hidden tab.
- **SSR without starting streams.** Value hooks render their initial value on the server; the promise
  hook lets a child show its Suspense fallback. Pass the same initial state to the client for matching
  markup, then let the subscription bring it up to date after hydration.
- **Typed and tested.** Ships TypeScript types, works under the React Compiler, and its own suite
  runs twice — once normally and once compiled — to keep both paths honest.

A short, concrete tour of each of these lives in the [interactive examples](https://react-rx.dev/examples/simple),
which you can edit in the browser.

## Is react-rx the right tool?

Choose react-rx when you already have observables, or when RxJS helps you express timing,
cancellation, or several sources of updates together. For a checkbox or a local counter, `useState`
is enough; for request caching and invalidation, a query library may be a better starting point.
react-rx connects observables to React — it does not replace every kind of state management. See the
[comparison](https://react-rx.dev/comparison) for how it fits beside other RxJS bindings and state
libraries.

## Used in real applications

[Sanity Studio](https://github.com/sanity-io/sanity) uses react-rx to read observable data in React.
[This merged change](https://github.com/sanity-io/sanity/pull/13788) shows practical examples,
including permissions and stored searches, and explains which manual subscriptions were deliberately
kept. That code predates v7, so follow this repository's guide for the current API.

## Learn more

- [Guide](https://react-rx.dev/guide): the hooks, their contracts, and the critical caveats.
- [Examples](https://react-rx.dev/examples/simple): working lessons you can edit in your browser.
- [Comparison](https://react-rx.dev/comparison): react-rx next to other RxJS bindings and state tools.
- [API reference](https://react-rx.dev/reference): signatures, options, and edge cases.
- [Upgrading to v7](https://react-rx.dev/migrate/v6-to-v7): changes to initial values and event handling.

### Coding agents

For focused react-rx guidance — choosing hooks, placing Suspense boundaries, keeping observables
stable, and reviewing subscriptions — install the dedicated best-practices skill:

```sh
npx skills add sanity-io/react-rx --skill react-rx-best-practices
```

For broader RxJS review and refactoring guidance, the `rxjs-like-a-pro` skill is also available:

```sh
npx skills add sanity-io/react-rx --skill rxjs-like-a-pro
```

Agents can also read the [documentation index](https://react-rx.dev/llms.txt) or the
[full docs with example source](https://react-rx.dev/llms-full.txt).

## Contributing and releasing new versions to npm

This package lives in the [`react-rx` monorepo](https://github.com/sanity-io/react-rx) and uses [Changesets](https://github.com/changesets/changesets) to manage versioning and publishing.

When you make a change that should be released, add a changeset to your pull request:

```sh
pnpm changeset
```

Once pull requests with changesets are merged into the `current` branch, a "Version Packages" pull request is opened (and kept up to date) that bumps the affected package versions and updates their changelogs. Merging that pull request publishes the packages to npm through the [`Release` workflow](https://github.com/sanity-io/react-rx/actions/workflows/release.yml), which uses npm [Trusted Publishing](https://docs.npmjs.com/trusted-publishers) (OIDC).

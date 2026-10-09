[![CI](https://github.com/sanity-io/react-rx/actions/workflows/ci.yml/badge.svg?event=push)](https://github.com/sanity-io/react-rx/actions/workflows/ci.yml) [![npm version](https://img.shields.io/npm/v/react-rx.svg)](https://www.npmjs.com/package/react-rx)

[![react-rx-some-smaller](https://user-images.githubusercontent.com/81981/194187624-9abd09da-bf03-4886-b512-78c1f22fc2de.png)](https://react-rx.dev/)

## RxJS values in React components

react-rx lets React components read values from RxJS observables. You describe how values change with
RxJS; the hooks subscribe, update the component, and clean up when it unmounts.

It is useful when your UI follows something that keeps changing: a live document, search results,
upload progress, or a clock. You do not need to move the rest of your application state into RxJS.

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

`0` is the initial value. After React mounts the component, the hook subscribes and receives updates
from the timer. Keep the observable outside the component, as above, or use `useMemo` when it depends
on props. Creating a new observable on every render can restart the work repeatedly.

### Already subscribing in an effect?

For a stream that only supplies a value to render, this:

```tsx
const [value, setValue] = useState(initialValue)

useEffect(() => {
  const subscription = value$.subscribe(setValue)
  return () => subscription.unsubscribe()
}, [value$])
```

can usually become:

```tsx
const value = useObservable(value$, initialValue)
```

The hook also sends stream errors to React's nearest Error Boundary. Its updates are deferred, so
React can prioritize work such as typing. Use `useSyncObservable` when the value controls an input.
Keep an effect for subscriptions that perform work without rendering a value, such as analytics.

## Choose a hook

| What you need                                                  | Use                                        |
| -------------------------------------------------------------- | ------------------------------------------ |
| Display a live value, with something to show before it arrives | `useObservable(stream$, initialValue)`     |
| Keep a controlled input in sync with a stream                  | `useSyncObservable(stream$, initialValue)` |
| Show a Suspense fallback until the first value arrives         | `useObservablePromise(stream$)`            |
| Send component events into an RxJS pipeline                    | `useObservableSubject()`                   |

Both value hooks require an initial value, even if that value is `undefined`. They never subscribe
during render. On the server, they render the initial value without starting the observable.

## Suspense

Use `useObservablePromise` when there is no useful value to show while waiting. It returns a promise
that a child component reads with React's `use()`.

Put a `<Suspense>` boundary **between the component that calls the hook and the child that reads the
promise**. The parent needs to mount before its subscription starts. Reading the promise in that
same component can leave it waiting for a request that never starts.

The first value replaces the fallback. Later values from the same observable update the content
without showing the fallback again.

Follow the [Suspense guide](https://react-rx.dev/guide#useobservablepromise), try
[data fetching](https://react-rx.dev/examples/data-fetching), or explore the
[Async React demo](https://async-react.sanity.dev/) for a full application.

## Is react-rx the right tool?

Choose react-rx when you already have observables, or when RxJS helps you express timing,
cancellation, or several sources of updates together.

For a checkbox or a local counter, `useState` is usually enough. For request caching and
invalidation, a query library such as TanStack Query may be a better starting point. react-rx connects
observables to React; it does not replace every kind of state management.

See [choosing between libraries](https://react-rx.dev/guide#choosing-between-libraries) for how it fits
alongside other RxJS bindings and state libraries.

## Used in real applications

[Sanity Studio](https://github.com/sanity-io/sanity) uses react-rx to read observable data in React.
[This merged change](https://github.com/sanity-io/sanity/pull/13788) shows practical examples, including
permissions and stored searches. It also explains which manual subscriptions were kept and why.
The code uses an older version of react-rx; follow this repository's guide for the current API.

## Learn more

- [Guide](https://react-rx.dev/guide): start with a value, then add events and loading states.
- [Examples](https://react-rx.dev/examples/simple): edit working examples in your browser.
- [API reference](https://react-rx.dev/reference): signatures, options, and edge cases.
- [Upgrading to v7](https://react-rx.dev/migrate/v6-to-v7): changes to initial values and event handling.

### Coding agents

The repository's `rxjs-like-a-pro` skill includes guidance for choosing react-rx hooks, handling
events, and reviewing subscriptions without rewriting code that should stay in an effect.

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

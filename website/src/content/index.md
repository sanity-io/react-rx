[![react-rx-some-smaller](https://user-images.githubusercontent.com/81981/194187624-9abd09da-bf03-4886-b512-78c1f22fc2de.png)](https://react-rx.dev/)

## Read an observable. Render its value.

react-rx connects RxJS observables to React components. RxJS decides how values change — timing,
cancellation, several sources at once — and react-rx handles the subscription and React updates. It
targets React `^19.2` and is built around concurrent rendering, Suspense, and `<Activity>`.

If you already use RxJS for live data, search, or events, read those streams directly in your
components instead of copying each value into `useState`.

```tsx
import {useObservable} from 'react-rx'
import {timer} from 'rxjs'

const seconds$ = timer(0, 1000)

function ElapsedTime() {
  const seconds = useObservable(seconds$, 0)
  return <p>{seconds} seconds elapsed</p>
}
```

The component starts at `0`. Once it commits, the hook subscribes to the timer and updates the
display; when it unmounts, the hook cleans up. Updates are deferred through React's scheduler, so a
busy stream never blocks typing.

## Start here

- **New to react-rx?** The [guide](/guide) covers each hook, its contract, and the caveats that
  matter.
- **Prefer to experiment?** Open the [first lesson](/examples/simple) and edit it in your browser.
- **Building controlled UI?** Try [controlled state](/examples/counters) and
  [synchronous emissions](/examples/sync), which includes a live `hydrateRoot` demo.
- **Loading states?** Read about [Suspense](/guide#useobservablepromise), then work through
  [data fetching](/examples/data-fetching), [streaming chat](/examples/streaming-chat), and
  [resilient fetch](/examples/resilient-fetch).
- **Comparing options?** The [comparison](/comparison) weighs react-rx against other RxJS bindings
  and state tools.
- **Looking up a hook?** The [API reference](/reference) covers arguments, return values, and options.
- **Upgrading?** See the [v7 migration guide](/migrate/v6-to-v7).

## What belongs in a stream?

Observables shine when several things affect the same result: a query changes, a request finishes, a
timer ticks, or a live document updates. RxJS lets you describe how those events fit together before
React renders the result.

Keep ordinary local state in React. A checkbox doesn't need an observable just because another part
of the page uses one. The [comparison](/comparison) shows where react-rx fits beside query caches,
state containers, and state machines.

## See it in an application

The [Async React demo](https://async-react.sanity.dev/) shows loading, navigation, and preloading in
a complete app. For production code, see [Sanity Studio's adoption of
react-rx](https://github.com/sanity-io/sanity/pull/13788), including the subscriptions it deliberately
left unchanged. That code predates v7, so use this guide for current hook signatures.

## Using a coding agent?

Install the dedicated react-rx best-practices skill for hook selection, Suspense boundaries, stable
observables, and subscription review:

```sh
npx skills add sanity-io/react-rx --skill react-rx-best-practices
```

A broader `rxjs-like-a-pro` skill is also available:

```sh
npx skills add sanity-io/react-rx --skill rxjs-like-a-pro
```

The [documentation index](/llms.txt) and [full documentation](/llms-full.txt) are available as plain
text; the full version includes the source of every interactive example.

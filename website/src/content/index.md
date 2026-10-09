[![react-rx-some-smaller](https://user-images.githubusercontent.com/81981/194187624-9abd09da-bf03-4886-b512-78c1f22fc2de.png)](https://react-rx.dev/)

## Read an observable. Render its value.

react-rx connects RxJS observables to React components. RxJS handles how values change; react-rx
handles subscriptions and React updates.

If you already use RxJS for live data, search, or events, you can read those streams directly in your
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

The component starts at `0`. Once it mounts, the hook subscribes to the timer and updates the
display. When the component unmounts, the hook cleans up its subscription.

## Start here

- **New to react-rx?** The [guide](/guide) walks through reading values and handling events.
- **Prefer to experiment?** Open the [first example](/examples/simple) and edit it in your browser.
- **Working with loading states?** Read about [Suspense](/guide#useobservablepromise), then try the
  [data-fetching example](/examples/data-fetching).
- **Looking up a hook?** The [API reference](/reference) covers arguments, return values, and options.
- **Upgrading?** See the [v7 migration guide](/migrate/v6-to-v7).

## What belongs in a stream?

Observables are useful when several things affect the same result: a query changes, a request
finishes, a timer ticks, or a live document receives an update. RxJS lets you describe how those
events fit together before React renders the result.

You can keep ordinary local state in React. A checkbox does not need an observable just because
another part of the page uses one. Read [choosing between libraries](/guide#choosing-between-libraries)
if you are deciding whether to use RxJS at all.

## See it in an application

The [Async React demo](https://async-react.sanity.dev/) shows loading, navigation, and preloading in
a complete app. For production code, see [Sanity Studio's adoption of
react-rx](https://github.com/sanity-io/sanity/pull/13788), including the subscriptions it deliberately
left unchanged. Those examples predate v7, so use this guide for current hook signatures.

## Using a coding agent?

Install the repository's RxJS skill for react-rx hook selection and subscription review:

```sh
npx skills add sanity-io/react-rx --skill rxjs-like-a-pro
```

The [documentation index](/llms.txt) and [full documentation](/llms-full.txt) are also available as
plain text. The full version includes the source of the interactive examples.

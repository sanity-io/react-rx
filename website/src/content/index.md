[![react-rx-some-smaller](https://user-images.githubusercontent.com/81981/194187624-9abd09da-bf03-4886-b512-78c1f22fc2de.png)](https://react-rx.dev/)

> React hooks for RxJS Observables — live state that cooperates with concurrent rendering

RxJS is how you orchestrate the state that plain React makes hard: live streams (chat messages, LLM tokens), time ("posted 5 seconds ago", intervals, debounce), and data fetching with retry, resume, and cancellation semantics. react-rx is how those streams become React state — with first-class support for Suspense, Transitions, `<Activity>`, SSR, and the React Compiler.

## Why react-rx

- **Non-blocking by default.** `useObservable` defers store updates: chatty streams can't make typing feel blocked, and updates coalesce under load. The deferral is _identity-coherent_ — when the observable changes, the previous observable's value can never render under the new one.
- **Synchronous emissions paint on the first render.** No re-render-on-mount tax: a `BehaviorSubject` or replayed value renders immediately, on the client and during SSR.
- **First-class [`<Activity>`](https://react.dev/reference/react/Activity) (React 19.2).** Hidden trees keep warm snapshots and reveal instantly; pre-rendered trees start their data fetches during render — see [Activity and preload](/examples/activity).
- **Suspense-powered data fetching.** [`useObservablePromise`](/reference#useobservablepromise) turns any observable into a `use()`-compatible promise: suspend until the first emission, then live-update in place without re-suspending — see [Suspense data fetching](/examples/data-fetching).
- **SSR that never throws.** `useObservable` renders exactly what the client's first paint will show.
- **React Compiler tested.** The entire test suite runs twice — once plain, once compiled through the React Compiler.
- **Tiny.** ESM-only, tree-shakeable, one small dependency, fully typed.

## What people build with it

- [Streaming LLM replies](/examples/llm-chat) — tokens accumulate with `scan`, several conversations stream concurrently behind `<Activity>`
- ["x seconds ago" timestamps](/examples/relative-time) — one shared ticking `timer` drives every label
- [Offline-resilient data fetching](/examples/resilient-fetch) — polling that pauses offline, resumes on reconnect, retries with backoff
- [Render-as-you-fetch tabs](/examples/data-fetching) — Suspense data fetching with hover preloading

Start with the [guide](/guide), skim the [API reference](/reference), or see [how react-rx compares](/comparison) to other RxJS bindings and to state libraries like Zustand, XState, and TanStack Query.

## Used in production

react-rx powers live document reads, previews, presence, and validation throughout [Sanity Studio](https://github.com/sanity-io/sanity), the [sanity-io/plugins](https://github.com/sanity-io/plugins) monorepo, and the wider Sanity plugin ecosystem — and direct dependents beyond it, like [navikt/aksel](https://github.com/navikt/aksel).

## Agent skill

Working with an AI coding agent? Install the [`react-rx-best-practices`](https://github.com/sanity-io/react-rx/tree/current/.agents/skills/react-rx-best-practices) skill from [skills.sh](https://skills.sh/sanity-io/react-rx) — it teaches agents when to use which hook (and when not to), how to keep observables referentially stable, and how to refactor hand-rolled `useEffect` + `.subscribe()` bridges:

```sh
npx skills add sanity-io/react-rx --skill react-rx-best-practices
```

Agents can also read these docs as a single markdown file at [react-rx.dev/llms-full.txt](https://react-rx.dev/llms-full.txt).

# When a Manual Subscription Is Right

Not every `.subscribe()` inside a component is a defect, and not every bridge should become a hook
read. These are the cases — learned the hard way in large refactors, including changes that were
**reverted after review** — where the existing code is the correct design. Check candidates against
this list *before* rewriting them.

## Leave alone: subscriptions that aren't value reads

- **Event-driven stores.** Code that subscribes to listen/mutation/connection events and *dispatches*
  in response (rebuild an index, invalidate a cache, emit telemetry) is an effect, not a render
  value. `useEffect` + `.subscribe()` is the honest shape for it.
- **Side-effect-only subscriptions.** A patch channel, a scroll-position writer, a `document.title`
  updater: nothing is rendered, so there is nothing for a reading hook to return. Keep the effect;
  consider `tap` + a single subscription for legibility, per the RxJS skill.
- **Callback-driven pagination / imperative APIs.** When an API hands you `onNextPage(cb)`-style
  callbacks, forcing it through a Subject just to use a hook adds indirection without value.
- **Non-RxJS pubsub.** Custom emitter objects that merely look observable-ish. `useSyncExternalStore`
  directly, or a thin real-Observable wrapper at the store level, beats pretending in the component.

## Leave alone: semantics the rewrite would silently change

- **Eager, non-cancellable promise producers.** If building the "observable" means calling something
  like `attempt(fetch(...))` — an API that *fires immediately* and can't be cancelled — then creating
  it during render fires requests from discarded concurrent renders. Cold RxJS observables are safe
  to construct in render because construction doesn't subscribe; eager promises are not. Keep the
  effect (or fix the API), don't move the call into render.
- **Previous-value-while-loading reducers.** Some hand-written reducers guarantee "keep showing the
  previous result while the next one loads, and dedupe identical results by reference". A naive
  rewrite that rebuilds the observable per param change resets to the initial/loading state on every
  keystroke instead. Either reproduce the guarantee in the stream (see the `scan` pattern in the
  RxJS skill's loading-state reference) or leave the reducer.
- **AbortController-coordinated fetches.** When cancellation is wired through an AbortController
  shared with non-RxJS code, the effect that owns the controller is load-bearing. Converting half of
  the coordination to a hook read splits ownership of cancellation.
- **Write-side reads.** A value read synchronously in an event handler to decide *whether to write*
  (equality check before save) must not become a deferred read. If it must be a hook at all, that is
  `useSyncObservable` — but a store `getValue()`/snapshot API inside the handler is often clearer.

## The stop rule

After drafting a refactor, compare it honestly against the original:

- Did lines of code go *up* without deleting a state machine?
- Did loading/reset-on-param-change behavior subtly change (check what the first render after a prop
  change shows)?
- Did errors move (boundary vs rendered value vs toast) without anyone deciding they should?
- Is the observable identity actually stable in the new version?

If the answer to the first question is yes and nothing else improved, **revert your own change**.
"The rewrite isn't clearer" is a complete reason not to ship it — a consistent codebase of honest
`useEffect` bridges beats a mixed one where half the conversions are worse than what they replaced.

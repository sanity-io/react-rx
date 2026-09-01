---
"react-rx": major
---

**Breaking:** remove `useObservableEvent`.

The hook was layers of abstraction over a plain RxJS `Subject`: it created one internally, returned `subject.next` as a callback, and subscribed your pipeline in an effect. Push events into a `Subject` yourself and read derived streams with `useObservable`, `useSyncObservable`, or `useObservablePromise` — a simpler pattern that also stays aligned with the upcoming [native Observable API](https://github.com/WICG/observable).

```tsx
// Before
const [value, setValue] = useState(1)
const handleChange = useObservableEvent((value$) => value$.pipe(map(Number), tap(setValue)))

// After — emissions are the rendered value, no local state or tap needed
const [rawValue$] = useState(() => new Subject<string>())
const value$ = useMemo(() => rawValue$.pipe(map(Number)), [rawValue$])
const value = useObservable(value$, 1)
// <input onChange={(event) => rawValue$.next(event.currentTarget.value)} />
```

See the [v6 → v7 migration guide](https://react-rx.dev/migrate/v6-to-v7) for more patterns, including side-effect-only pipelines.

The `use-effect-event` dependency existed only for this hook and has been removed too — `react-rx` now has zero runtime dependencies beyond its peers.

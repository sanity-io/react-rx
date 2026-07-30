[![CI](https://github.com/sanity-io/react-rx/actions/workflows/ci.yml/badge.svg?event=push)](https://github.com/sanity-io/react-rx/actions/workflows/ci.yml) [![npm version](https://img.shields.io/npm/v/react-rx.svg)](https://www.npmjs.com/package/react-rx)

[![react-rx-some-smaller](https://user-images.githubusercontent.com/81981/194187624-9abd09da-bf03-4886-b512-78c1f22fc2de.png)](https://react-rx.dev/)

> Hooks and utilities for combining React with RxJS Observables

Features:

- Works well with Observables emitting values synchronously. You don't pay the re-render-on-mount tax.
- Non-blocking by default — `useObservable` defers store updates; reach for `useSyncObservable` for controlled inputs.
- Lightweight. Implemented on top of a small React Hook based core.
- Full TypeScript support.

This package provides React hooks for working with RxJS Observables in your components.

## Requirements

- React `^19.2`
- RxJS `^7.2` — operators are imported from `'rxjs'` (not the deprecated `'rxjs/operators'` path). If you're still on an older RxJS, see the [RxJS import migration guide](https://rxjs.dev/guide/importing#how-to-migrate).

---

- [Guide](https://react-rx.dev/guide)
- [API reference](https://react-rx.dev/reference)
- [Migration (v4 → v5)](https://react-rx.dev/migrate/v4-to-v5)
- [Code examples](https://react-rx.dev/examples/simple)

---

# Contributing and releasing new versions to npm

This package lives in the [`react-rx` monorepo](https://github.com/sanity-io/react-rx) and uses [Changesets](https://github.com/changesets/changesets) to manage versioning and publishing.

When you make a change that should be released, add a changeset to your pull request:

```sh
pnpm changeset
```

Once pull requests with changesets are merged into the `current` branch, a "Version Packages" pull request is opened (and kept up to date) that bumps the affected package versions and updates their changelogs. Merging that pull request publishes the packages to npm through the [`Release` workflow](https://github.com/sanity-io/react-rx/actions/workflows/release.yml), which uses npm [Trusted Publishing](https://docs.npmjs.com/trusted-publishers) (OIDC).

[![CI](https://github.com/sanity-io/react-rx/actions/workflows/ci.yml/badge.svg?event=push)](https://github.com/sanity-io/react-rx/actions/workflows/ci.yml) [![npm version](https://img.shields.io/npm/v/react-rx.svg)](https://www.npmjs.com/package/react-rx)

# react-rx

> Hooks and utilities for combining React with RxJS Observables

This is the monorepo for [`react-rx`](https://react-rx.dev). It is managed with [pnpm workspaces](https://pnpm.io/workspaces) and [Changesets](https://github.com/changesets/changesets).

## Packages

| Package                                | Description                                            |
| -------------------------------------- | ------------------------------------------------------ |
| [`react-rx`](./packages/react-rx)      | React + RxJS = <3 — the published npm package.         |

## Apps

| App                       | Description                                       |
| ------------------------- | ------------------------------------------------- |
| [`website`](./website)    | The [react-rx.dev](https://react-rx.dev) website. |

## Development

Install dependencies from the repository root:

```sh
pnpm install
```

Common scripts (run from the repository root):

```sh
pnpm build   # build the react-rx package
pnpm test    # run the react-rx test suite
pnpm lint    # lint the whole workspace
pnpm format  # format the whole workspace with Prettier
pnpm dev     # start the website locally
```

## Releasing

Releases are automated with [Changesets](https://github.com/changesets/changesets).

1. Add a changeset describing your change:

   ```sh
   pnpm changeset
   ```

2. Commit the generated file in `.changeset/` together with your change and open a pull request.
3. When the pull request is merged into `current`, the [`Release` workflow](./.github/workflows/release.yml) opens (or updates) a "Version Packages" pull request that bumps versions and updates changelogs.
4. Merging the "Version Packages" pull request publishes the affected packages to npm using npm [Trusted Publishing](https://docs.npmjs.com/trusted-publishers) (OIDC) — no npm tokens required.

To register a brand new package for Trusted Publishing, run the [`Setup a new npm package with Trusted Publishing`](./.github/workflows/setup-trusted-publish.yml) workflow.

# AGENTS.md

## Cursor Cloud specific instructions

This is the `sanity-io/react-rx` pnpm monorepo (workspaces defined in `pnpm-workspace.yaml`):

- `packages/react-rx` — the `react-rx` library (RxJS + React hooks/utilities). Built with `@sanity/pkg-utils`, tested with Vitest.
- `website` — the docs site at react-rx.dev, built with Next.js 15 + Nextra. Interactive examples live in `website/src/examples`.

Standard commands are defined in the root `package.json` scripts and mirror CI (`.github/workflows/ci.yml`): `pnpm lint`, `pnpm test`, `pnpm build`, `pnpm dev`. Dependencies are installed with `pnpm install` (pnpm version is pinned via `packageManager`; Node 22 LTS works).

Non-obvious notes:

- `pnpm lint` runs Oxlint with `--type-aware` and `--type-check` (see `.oxlintrc.json`). CI builds `react-rx` before linting so package types resolve; the website also maps `react-rx` to source via `tsconfig` paths.
- `pnpm build` builds only the `react-rx` library (`pnpm --filter react-rx build`), not the website.
- `pnpm dev` runs the website dev server on `http://localhost:3000`. Its `predev` hook first builds `react-rx`, so the first startup takes longer than a normal Next.js boot. The website resolves `react-rx` directly from source (`packages/react-rx/src/index.ts`) via a webpack alias in `website/next.config.ts`, so library source edits are picked up by the website without rebuilding.
- `pnpm test` runs Vitest with `--typecheck` (type-level tests in `*.test-d.ts`) and runs each suite twice: once normally and once through the React Compiler (`react-compiler` project in `vitest.workspace.ts`).
- The `react-rx` build emits a harmless warning that `useCallback`/`useMemo` are imported but unused; this is expected and not a failure.
- A `caniuse-lite is X months old` Browserslist warning appears during test/build; it is non-fatal.

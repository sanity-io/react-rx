# AGENTS.md

## Cursor Cloud specific instructions

This is the `sanity-io/react-rx` pnpm monorepo (workspaces defined in `pnpm-workspace.yaml`):

- `packages/react-rx` — the `react-rx` library (RxJS + React hooks/utilities). Built with `tsdown` (configured through `@sanity/tsdown-config` in `packages/react-rx/tsdown.config.ts`), tested with Vitest.
- `website` — the docs site at react-rx.dev, built with Next.js 15 + Nextra. Interactive examples live in `website/src/examples`.

Standard commands are defined in the root `package.json` scripts and mirror CI (`.github/workflows/ci.yml`): `pnpm lint`, `pnpm test`, `pnpm build`, `pnpm dev`. Dependencies are installed with `pnpm install` (pnpm version is pinned via `packageManager`).

Non-obvious notes:

- `tsdown` requires Node `^22.18.0 || >=24.11.0`; it loads `tsdown.config.ts` with Node's native TypeScript support, and older Node 22 releases fail with `Failed to import module "unrun"`.
- `pnpm build` builds only the `react-rx` library (`pnpm --filter react-rx build`), not the website.
- `pnpm dev` runs the website dev server on `http://localhost:3000`. Its `predev` hook first builds `react-rx`, so the first startup takes longer than a normal Next.js boot. The website resolves `react-rx` directly from source (`packages/react-rx/src/index.ts`) via a webpack alias in `website/next.config.ts`, so library source edits are picked up by the website without rebuilding.
- `pnpm test` runs Vitest with `--typecheck` (type-level tests in `*.test-d.ts`) and runs each suite twice: once normally and once through the React Compiler (the `react-compiler` project in `packages/react-rx/vitest.config.ts`).
- The build ends with a `publint` warning about a missing `engines.node` field; it is expected and not a failure.
- `@sanity/tsdown-config` asks for TypeScript 6 or 7 as a peer dependency. The repo stays on TypeScript 5.9 (TypeScript 7 is the native port and ships no JS API, which `typescript-eslint` and Vitest's typechecker still need), so `pnpm install` prints an unmet peer warning for it.

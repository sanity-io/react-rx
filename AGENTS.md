# AGENTS.md

## Skills

Agent skills live in `.agents/skills/` (symlinked into `.claude/skills/`). When writing or reviewing React components that consume observables — including the website examples and docs snippets — follow `.agents/skills/react-rx-best-practices/SKILL.md`. For general RxJS composition, follow `.agents/skills/rxjs-like-a-pro/SKILL.md`.

## Cursor Cloud specific instructions

This is the `sanity-io/react-rx` pnpm monorepo (workspaces defined in `pnpm-workspace.yaml`):

- `packages/react-rx` — the `react-rx` library (RxJS + React hooks/utilities). Built with `tsdown` (configured through `@sanity/tsdown-config` in `packages/react-rx/tsdown.config.ts`), tested with Vitest.
- `website` — the docs site at react-rx.dev, built with Next.js 15 + Nextra. Interactive examples live in `website/src/examples`.

Standard commands are defined in the root `package.json` scripts and mirror CI (`.github/workflows/ci.yml`): `pnpm lint`, `pnpm test`, `pnpm build`, `pnpm dev`. Dependencies are installed with `pnpm install` (pnpm version is pinned via `packageManager`).

Non-obvious notes:

- `pnpm lint` runs Oxlint (type-aware + type-check via `.oxlintrc.json` `options`). `react-rx` resolves to its own source through the package's `exports`, so linting does not need a prior build even though CI happens to run one first. On GitHub Actions, Oxlint auto-selects the `github` output format.
- `tsdown` requires Node `^22.18.0 || >=24.11.0`; it loads `tsdown.config.ts` with Node's native TypeScript support, and older Node 22 releases fail with `Failed to import module "unrun"`.
- `pnpm build` builds only the `react-rx` library (`pnpm --filter react-rx build`), not the website.
- `pnpm dev` runs the website dev server on `http://localhost:3000`. Its `predev` hook first builds `react-rx`, so the first startup takes longer than a normal Next.js boot; the build is what the Sandpack examples inject in development (`readReactRxDist` reads `packages/react-rx/dist/index.js`). The website's own imports resolve `react-rx` to source through the package's `exports`, so library source edits are picked up without rebuilding.
- `pnpm test` runs Vitest with `--typecheck` (type-level tests in `*.test-d.ts`) and runs each suite twice: once normally and once through the React Compiler (the `react-compiler` project in `packages/react-rx/vitest.config.ts`).
- The build ends with a `publint` warning about a missing `engines.node` field; it is expected and not a failure.
- tsdown owns the `exports` map in `packages/react-rx/package.json`, so a local `pnpm build` can rewrite it (regeneration is skipped in CI, where the committed file is already current). Locally `exports` points at `./src/index.ts` and `publishConfig.exports` carries the `dist` entry points, which `pnpm publish` swaps in — `changeset publish` detects pnpm, so this is the path releases take.
- TypeScript is pinned to 6.0.3 in all three workspaces. Do not move to 7: it is the native port, whose `typescript` entry point is only a version stub, while tsdown's `.d.ts` generation, Vitest's typechecker, and Next.js all still need the JS API that 6.x ships. 6.x also satisfies `@sanity/tsdown-config`'s peer range, so `pnpm peers check` is clean.
- `packages/react-rx/tsdown.config.ts` annotates its default export with `satisfies Promise<UserConfig>`. Without it, declaration emit can only name the type through `@sanity/tsdown-config`'s own copy of `tsdown` and `tsc` fails with TS2883. Note that `pnpm lint` does not catch this — only `tsc -p packages/react-rx/tsconfig.json` does.

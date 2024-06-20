<!-- markdownlint-disable --><!-- textlint-disable -->

# 📓 Changelog

All notable changes to this project will be documented in this file. See
[Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [3.1.1](https://github.com/sanity-io/react-rx/compare/v3.1.0...v3.1.1) (2024-06-20)

### Bug Fixes

- remove react-compiler export condition ([#97](https://github.com/sanity-io/react-rx/issues/97)) ([3f32aca](https://github.com/sanity-io/react-rx/commit/3f32acad706dbf47329cf4ab6f5053b274901bee))

## [3.1.0](https://github.com/sanity-io/react-rx/compare/v3.0.0...v3.1.0) (2024-06-19)

### Features

- add experimental react-compiler condition ([#95](https://github.com/sanity-io/react-rx/issues/95)) ([5592c31](https://github.com/sanity-io/react-rx/commit/5592c311e8acf57209894a64baba11fa8bc49729))

## [3.0.0](https://github.com/sanity-io/react-rx/compare/v2.1.3...v3.0.0) (2024-06-12)

### ⚠ BREAKING CHANGES

- remove `useMemoObservable`
- require `rxjs` v7 and above
- use native `useSyncExternalStore`
- remove `forwardRef` export
- remove `reactiveComponent` and `rxComponent` exports
- remove `element` export
- remove `handler` export
- remove `state` export
- remove `context` export
- remove `useWithObservable` export
- remove deprecated `useAsObservable`
- remove deprecated `WithObservable`

### Features

- add `useObservableEvent` ([99bb565](https://github.com/sanity-io/react-rx/commit/99bb56553cc862d0f23f321a416bc1f785c1cda2))
- allow react 19 ([b561d3f](https://github.com/sanity-io/react-rx/commit/b561d3f40f7d44886bef54f265be64f51647930d))

### Bug Fixes

- **deps:** bump `observable-callback` to `1.0.3` ([7786e58](https://github.com/sanity-io/react-rx/commit/7786e583a596dd254cbb771ec55c1615a7b34dff))
- dispose cache entry upon observable termination ([#91](https://github.com/sanity-io/react-rx/issues/91)) ([377f476](https://github.com/sanity-io/react-rx/commit/377f476767f09aadef07f2a34305bb1146a44e58))
- improve SSR support by implementing `getServerSnapshot` ([9fd497a](https://github.com/sanity-io/react-rx/commit/9fd497aec413dc8c74ca299725961f1cfae8c4b7))
- require `rxjs` v7 and above ([d364664](https://github.com/sanity-io/react-rx/commit/d3646649bc036a7034dabb7fbc40275318b6d282))
- **test:** rename vitest.config.{js=>ts} ([bfb1799](https://github.com/sanity-io/react-rx/commit/bfb179983af59b9d5db19da212cde87669e68d6c))
- **test:** replace jest with vitest ([b0efea1](https://github.com/sanity-io/react-rx/commit/b0efea1d42c1928f213b5147df9d527a985efb5c))
- throw errors from observable in getSnapshot() ([807e822](https://github.com/sanity-io/react-rx/commit/807e8220a8af81b34a7220b0e0a4081e80887b82))
- type useObservable accurately ([b132f2b](https://github.com/sanity-io/react-rx/commit/b132f2bdfbdcd2c6cafc09740e8e6da69d2550b6))
- use native `useSyncExternalStore` ([fdc4d14](https://github.com/sanity-io/react-rx/commit/fdc4d14f4be392125c5f8df32fb3b93cfa77061a))
- **useObservable:** infer the return type ([2dda7fc](https://github.com/sanity-io/react-rx/commit/2dda7fc7486e7220d84bab8208b6e1ec34a1ffcc))
- **useObservable:** support error boundaries ([1f42210](https://github.com/sanity-io/react-rx/commit/1f42210466894bd8c04fb25bb30df705e17e8d90))

### Code Refactoring

- remove `context` export ([08c3d4d](https://github.com/sanity-io/react-rx/commit/08c3d4d69f8114f95d241540243b7c0ac4a7c72e))
- remove `element` export ([f873d2a](https://github.com/sanity-io/react-rx/commit/f873d2a76055aa1371258e3a015c20ef2e840d5a))
- remove `forwardRef` export ([bd9ea08](https://github.com/sanity-io/react-rx/commit/bd9ea08789f17b5ffea4cc81814e931ba03cc051))
- remove `handler` export ([8813e57](https://github.com/sanity-io/react-rx/commit/8813e5713bcec2a134338e38b426bdd07a9a3b59))
- remove `reactiveComponent` and `rxComponent` exports ([cf71571](https://github.com/sanity-io/react-rx/commit/cf71571bf336cc6a88707a7e09d4e9ecf561fcad))
- remove `state` export ([86ef5b9](https://github.com/sanity-io/react-rx/commit/86ef5b95c2f90a69f4fece86006d793ef81d2a76))
- remove `useMemoObservable` ([e9ba55f](https://github.com/sanity-io/react-rx/commit/e9ba55feca34d73f8cc1b0b70544ea8d97d4c805))
- remove `useWithObservable` export ([9a57fd8](https://github.com/sanity-io/react-rx/commit/9a57fd8fbf6d0df3c088450ecbe3044107b2bcd2))
- remove deprecated `useAsObservable` ([e128f39](https://github.com/sanity-io/react-rx/commit/e128f392f13ae91ee9ea84b37b1dd7e7ad93b8c4))
- remove deprecated `WithObservable` ([55d30da](https://github.com/sanity-io/react-rx/commit/55d30da3992fe9502f9493065bb8f286e0b8c969))

## [2.1.3](https://github.com/sanity-io/react-rx/compare/v2.1.2...v2.1.3) (2022-10-06)

### Bug Fixes

- mark deprecated APIs with TSDoc ([#24](https://github.com/sanity-io/react-rx/issues/24)) ([0f2f2bf](https://github.com/sanity-io/react-rx/commit/0f2f2bf66089e2a37450513bd472d7ba2b1b37e2))

## [2.1.2](https://github.com/sanity-io/react-rx/compare/v2.1.1...v2.1.2) (2022-10-06)

### Bug Fixes

- **deps:** update dependency observable-callback to ^1.0.2 ([#17](https://github.com/sanity-io/react-rx/issues/17)) ([9e600aa](https://github.com/sanity-io/react-rx/commit/9e600aa717c0ab85eb56c55ec132fef2ac9fd500))
- **pkg:** move overrides logic to renovatebot ([2aafdda](https://github.com/sanity-io/react-rx/commit/2aafdda8c7aad81efbb6d55eadaccef8bea3f86f))

## [2.1.1](https://github.com/sanity-io/react-rx/compare/v2.1.0...v2.1.1) (2022-10-06)

### Bug Fixes

- **package:** remove junk files from published package ([c373641](https://github.com/sanity-io/react-rx/commit/c3736416e96a800c109320d332347e60b97f7c0d))
- **pkg:** add LICENSE ([6a61fd3](https://github.com/sanity-io/react-rx/commit/6a61fd30b67b0f6bab2c94ab8395e33e7a31a1b7))
- **pkg:** update links to the moved repo ([68c56bb](https://github.com/sanity-io/react-rx/commit/68c56bb805fe2fd6141537299b8efb8c9bb6b245))

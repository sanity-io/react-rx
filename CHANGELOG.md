<!-- markdownlint-disable --><!-- textlint-disable -->

# 📓 Changelog

All notable changes to this project will be documented in this file. See
[Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [3.0.0-crx-749.1](https://github.com/sanity-io/react-rx/compare/v2.1.3...v3.0.0-crx-749.1) (2024-06-09)

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

- add `useObservableEvent` ([c50862d](https://github.com/sanity-io/react-rx/commit/c50862d6dd2e7b5275e9b43c5d2043109a5b738c))
- allow react 19 ([5d82331](https://github.com/sanity-io/react-rx/commit/5d82331b3db55e66a9f105f2cb903efec7a18b16))

### Bug Fixes

- **deps:** bump `observable-callback` to `1.0.3` ([4c0db0f](https://github.com/sanity-io/react-rx/commit/4c0db0f42fe3e3184ead4295defcefeb1f790bb0))
- require `rxjs` v7 and above ([724e59d](https://github.com/sanity-io/react-rx/commit/724e59dcc2da961690040ed304257b66a6985c26))
- use native `useSyncExternalStore` ([9a12927](https://github.com/sanity-io/react-rx/commit/9a1292778e943bca6b121edf7bbc2ac7ebe975c6))
- **useObservable:** infer the return type ([c74a0bd](https://github.com/sanity-io/react-rx/commit/c74a0bdd72baeb32574a7602a903d421f0a5439b))

### Code Refactoring

- remove `context` export ([a9651e8](https://github.com/sanity-io/react-rx/commit/a9651e8ce06a6178a603dddb4057b528af0b12ce))
- remove `element` export ([34cff85](https://github.com/sanity-io/react-rx/commit/34cff85d0e6abbbec033076dd18afa0c2b8e719b))
- remove `forwardRef` export ([41f7888](https://github.com/sanity-io/react-rx/commit/41f78881096325fe485a09ca8f957f33fd5600d7))
- remove `handler` export ([7d9014f](https://github.com/sanity-io/react-rx/commit/7d9014f334b0bde0c87a243af8d3342d0e6df1ff))
- remove `reactiveComponent` and `rxComponent` exports ([7175b0e](https://github.com/sanity-io/react-rx/commit/7175b0e8328b1de04878e51b6593168c2f39bec7))
- remove `state` export ([ff8b43f](https://github.com/sanity-io/react-rx/commit/ff8b43fe983841969af895073dc2666ae239953c))
- remove `useMemoObservable` ([e57b8a6](https://github.com/sanity-io/react-rx/commit/e57b8a6309f8c0b7cd6c8dee5eb9a2516fc41c45))
- remove `useWithObservable` export ([5089bd1](https://github.com/sanity-io/react-rx/commit/5089bd10897b4d834fd163a0ecc733a32a658a93))
- remove deprecated `useAsObservable` ([3f1e898](https://github.com/sanity-io/react-rx/commit/3f1e89809acfddd275e4f6bd8674f15e9e5cef74))
- remove deprecated `WithObservable` ([65588f0](https://github.com/sanity-io/react-rx/commit/65588f06d2fa84f80923c68b43c31d52a7c4fbd5))

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

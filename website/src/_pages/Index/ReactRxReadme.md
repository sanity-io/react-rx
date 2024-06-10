[![CI & Release](https://github.com/sanity-io/react-rx/actions/workflows/ci.yml/badge.svg?event=push)](https://github.com/sanity-io/react-rx/actions/workflows/ci.yml) [![npm version](https://img.shields.io/npm/v/react-rx.svg)](https://www.npmjs.com/package/react-rx)

[![react-rx-some-smaller](https://user-images.githubusercontent.com/81981/194187624-9abd09da-bf03-4886-b512-78c1f22fc2de.png)](https://react-rx.dev/)

> Hooks and utilities for combining React with RxJS Observables

Features:

- Works well with Observables emitting values synchronously. You don't pay the re-render-on-mount tax.
- Lightweight. Implemented on top of a small React Hook based core.
- Full TypeScript support.

This package offers two slightly different utilities for working with RxJS and React:

- A set of utilities for creating _Reactive components_
- A set of React hooks for using with observables with React

Although they share a lot of similarities, and reactiveComponent is built on top of `useObservable` are not intended to be used together inside the same component as they represent two different programming styles.

---

- [Reactive components](https://react-rx.dev/guide#reactive-components)
- [Observable hooks](https://react-rx.dev/guide#observable-hooks)
- [Code examples](https://react-rx.dev/examples)

---

# Contributing and publishing new versions to npm

Run the ["CI & Release" workflow](https://github.com/sanity-io/react-rx/actions/workflows/ci.yml).
Make the default branch, `current`, should be preselected. Check "Release new version" and press "Run workflow'.

Semantic release will only release on configured branches, so it is safe to run release on any branch.

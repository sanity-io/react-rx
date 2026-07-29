---
"react-rx": patch
---

Build with `tsdown` instead of `@sanity/pkg-utils`. The bundled output is now produced by rolldown.

tsdown generates the `exports` map, so the `source` condition is no longer published — `import` resolves `dist/index.js` and `require` resolves `dist/index.cjs`, as before.

The `src` directory is no longer published either, which cuts the tarball from 10.8 kB to 7.8 kB. The JS sourcemaps embed their own sources, so stepping through the library in a debugger still shows the original TypeScript.

The `browserslist` field is gone, as tsdown does not read it. It made no difference to the output: the emitted bundles are byte-identical with and without the syntax lowering targets it resolved to.

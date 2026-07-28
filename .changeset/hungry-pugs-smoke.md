---
"react-rx": patch
---

Build with `tsdown` instead of `@sanity/pkg-utils`. The bundled output is now produced by rolldown and ships declaration maps.

tsdown generates the `exports` map, so the `source` condition is no longer published — `import` resolves `dist/index.js` and `require` resolves `dist/index.cjs`, as before. The `src` directory is still published, and the declaration maps point into it.

The `browserslist` field is gone, as tsdown does not read it. It made no difference to the output: the emitted bundles are byte-identical with and without the syntax lowering targets it resolved to.

---
"react-rx": patch
---

Build with `tsdown` instead of `@sanity/pkg-utils`. The published entry points are unchanged; the bundled output is now produced by rolldown and ships declaration maps.

The `browserslist` field is gone, as tsdown does not read it. It made no difference to the output: the emitted bundles are byte-identical with and without the syntax lowering targets it resolved to.

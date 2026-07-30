---
"react-rx": minor
---

Stop publishing CommonJS builds — the package is ESM-only. With the Node.js `>=22.12` engine requirement, `require()` of ESM is supported, so this is not a breaking change for consumers that follow `engines`.

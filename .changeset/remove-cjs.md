---
"react-rx": minor
---

Stop publishing CommonJS builds. The package is now ESM-only.

With the existing Node.js `>=22.12` engine requirement, `require()` of ESM is supported, so this is not a breaking change for consumers that follow `engines`.

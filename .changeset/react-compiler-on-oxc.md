---
"react-rx": patch
---

perf: build with the React Compiler on oxc (`oxc-transform-react`, the native Rust port) instead of `babel-plugin-react-compiler`. The published output is unchanged — one compiler pass now handles React Compiler, TypeScript, and JSX natively, and babel is no longer part of the build or test pipeline.

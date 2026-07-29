---
"react-rx": major
---

**BREAKING:** Require RxJS `^7.2` as a peer dependency (operators are imported from `'rxjs'`, which landed in 7.2). Import operators from `'rxjs'` instead of the deprecated `'rxjs/operators'` path.

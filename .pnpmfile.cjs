// `packages/react-rx` installs React 19.2 next to 19.3 (`react-19.2` / `react-dom-19.2` npm: aliases)
// so vitest can run the suite against both. react-dom asserts an *exact* `react` version match at
// runtime, but pnpm resolves its `react` peer by name from the dependent's own deps, which lands on
// the regular `react@19.3`. Pin the pair by turning the peer into a regular dependency instead.
function readPackage(pkg) {
  if (pkg.name === 'react-dom' && pkg.version.startsWith('19.2.')) {
    delete pkg.peerDependencies.react
    pkg.dependencies = {...pkg.dependencies, react: pkg.version}
  }
  return pkg
}

module.exports = {hooks: {readPackage}}

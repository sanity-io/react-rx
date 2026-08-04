import {execSync} from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

/**
 * Builds the `async-react/` workspace (the forked React Conf 2025 demo, migrated to react-rx)
 * and copies its dist into the website's public folder, where the docs example page embeds it.
 * Runs from the website's predev/prebuild hooks.
 */
const websiteDir = path.join(import.meta.dirname, '..')
const appDir = path.join(websiteDir, '..', 'async-react')
const outDir = path.join(websiteDir, 'public', 'async-react-demo')

execSync('pnpm exec vite build --base=/async-react-demo/', {cwd: appDir, stdio: 'inherit'})

fs.rmSync(outDir, {recursive: true, force: true})
fs.cpSync(path.join(appDir, 'dist'), outDir, {recursive: true})

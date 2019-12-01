import {Example} from '../../Examples'

const fs = require('fs')

export const SyncExample: Example = {
  id: 'sync-render',
  title: 'Sync rendering',
  source: fs.readFileSync(`${__dirname}/Sync.example.tsx`, 'utf-8')
}
